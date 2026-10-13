import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { User, Challenge, Session, Trip, Document } from "./models.js";
import { hashToken, token, otp, hashCode } from "./security.js";
import { sendOtp } from "./mail.js";
import { generateItinerary } from "../src/data/sampleData.js";
import {
  email,
  password,
  registration,
  loginSchema,
  verification,
  tripSchema,
  expenseSchema,
  today,
} from "../src/lib/validation.js";
import { getRate, roundMoney, shares, balances } from "./money.js";
import { accountRoutes, tripFeatures } from "./features.js";
import { geo } from "./integrations.js";
import { planTrip } from "./planner.js";
const revisionFilter = (t) =>
  t.revision === 0
    ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] }
    : { revision: t.revision };
const fail = (status, message) => Object.assign(new Error(message), { status });
const publicUser = (u) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  username: u.username || "",
  currency: u.currency || "INR",
  preferences: u.preferences || [],
  timeZone: u.timeZone || "UTC",
  hasPassword: !!u.passwordHash,
});
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
function safeErrorMessage(error) {
  if (error.code === 11000)
    return "A unique index rejected a duplicate record.";
  let message = String(error.message || "Unknown server error");
  for (const key of [
    "MONGODB_URI",
    "OTP_SECRET",
    "JWT_SECRET",
    "BREVO_API_KEY",
    "BREVO_SMTP_KEY",
    "GOOGLE_CLIENT_SECRET",
    "GEOAPIFY_API_KEY",
  ]) {
    const secret = process.env[key];
    if (secret) message = message.split(secret).join("[hidden]");
  }
  return message
    .replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[MongoDB connection string hidden]")
    .slice(0, 1000);
}
export function createApp({
  mailer = sendOtp,
  logger = console,
  rates = getRate,
  googleExchange,
  geocoder,
} = {}) {
  const app = express();
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "https://tile.openstreetmap.org"],
          "connect-src": ["'self'", "https://tile.openstreetmap.org"],
          "upgrade-insecure-requests":
            process.env.NODE_ENV === "production" ? [] : null,
        },
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }),
  );
  app.use(express.json({ limit: "3mb" }));
  app.use(cookieParser());
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== process.env.CLIENT_ORIGIN
    )
      return next(fail(403, "Request origin is not allowed"));
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      message: {
        message: "Too many requests. Please wait one minute and try again.",
      },
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    skip: (req) => req.method === "GET" || req.path === "/logout",
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many attempts. Try again in 15 minutes." },
  });
  app.use("/api/auth", authLimit);
  async function requireUser(req, res, next) {
    const s =
      req.cookies.wayfare_session &&
      (await Session.findOne({
        tokenHash: hashToken(req.cookies.wayfare_session),
        expiresAt: { $gt: new Date() },
      }));
    const u = s && (await User.findById(s.userId));
    if (!u || u.sessionVersion !== s.version)
      throw fail(401, "Please sign in to continue");
    req.user = u;
    next();
  }
  async function signIn(res, u) {
    const raw = token();
    await Session.create({
      tokenHash: hashToken(raw),
      userId: u._id,
      version: u.sessionVersion,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    res.cookie("wayfare_session", raw, {
      ...cookieOptions(),
      maxAge: 7 * 86400000,
    });
  }
  const generic = {
    message:
      "If this email is eligible, a verification code has been sent. Check your inbox and spam folder.",
  };
  async function requestCode(body, purpose) {
    const key = `${purpose}:${body.email}`;
    const now = new Date();
    const existing = await Challenge.findOne({ key });
    if (existing && now - existing.sentAt < 60000)
      throw fail(429, "Please wait 60 seconds before requesting another code");
    const user = await User.findOne({ email: body.email });
    // Record cooldown even for ineligible addresses to keep public responses consistent.
    const code = otp();
    const payload = {
      email: body.email,
      purpose,
      codeHash: hashCode(key, code),
      sentAt: now,
      expiresAt: new Date(+now + 600000),
      attempts: 0,
    };
    if (purpose === "register") {
      payload.name = body.name;
      payload.username = body.username;
      payload.passwordHash = await bcrypt.hash(body.password, 12);
    }
    let record;
    try {
      record = await Challenge.findOneAndUpdate(
        {
          key,
          $or: [
            { sentAt: { $lte: new Date(+now - 60000) } },
            { sentAt: { $exists: false } },
          ],
        },
        { $set: payload },
        { upsert: true, returnDocument: "after" },
      );
    } catch (e) {
      if (e.code === 11000)
        throw fail(
          429,
          "Please wait 60 seconds before requesting another code",
        );
      throw e;
    }
    if ((purpose === "register" && user) || (purpose === "reset" && !user))
      return;
    try {
      await mailer(body.email, code, purpose);
    } catch (error) {
      await Challenge.deleteOne({
        _id: record._id,
        codeHash: payload.codeHash,
      });
      throw fail(
        502,
        error.publicMessage ||
          "Email could not be sent. Please try again shortly.",
      );
    }
  }
  async function consumeCode(body, purpose) {
    const key = `${purpose}:${body.email}`;
    const challenge = await Challenge.findOneAndUpdate(
      { key, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    );
    if (!challenge || challenge.codeHash !== hashCode(key, body.code))
      throw fail(
        400,
        "Code is invalid or expired. Request a new code if needed.",
      );
    const consumed = await Challenge.findOneAndDelete({
      _id: challenge._id,
      codeHash: challenge.codeHash,
    });
    if (!consumed) throw fail(400, "Code has already been used");
    return consumed;
  }
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/auth/register", async (req, res) => {
    const body = registration.parse(req.body);
    if (body.username && await User.exists({ username: body.username }))
      throw fail(409, "This username is taken. Choose another.");
    await requestCode(body, "register");
    res.json({ ...generic, resendAfter: 60, expiresIn: 600 });
  });
  app.post("/api/auth/verify-registration", async (req, res) => {
    const body = verification.parse(req.body);
    req.operation = "verify-registration-code";
    const c = await consumeCode(body, "register");
    if (await User.exists({ email: body.email }))
      throw fail(400, "Unable to create account. Try signing in.");
    req.operation = "create-account";
    const u = await User.create({
      email: c.email,
      name: c.name,
      ...(c.username ? { username: c.username } : {}),
      passwordHash: c.passwordHash,
    });
    req.operation = "create-session";
    await signIn(res, u);
    res.status(201).json({ user: publicUser(u) });
  });
  app.post("/api/auth/login", async (req, res) => {
    const b = loginSchema.parse(req.body);
    const u = await User.findOne(b.email.includes("@") ? { email: b.email } : { username: b.email });
    const valid = await bcrypt.compare(
      b.password,
      u?.passwordHash ||
        "$2b$12$6KAX69YP0QIbdCUftmyxvOXBYHVCEEB00axEFRLYBgIxze5YgsynS",
    );
    if (!u?.passwordHash || !valid)
      throw fail(401, "Email / username or password is incorrect");
    await signIn(res, u);
    res.json({ user: publicUser(u) });
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    await requestCode(z.object({ email }).parse(req.body), "reset");
    res.json({ ...generic, resendAfter: 60, expiresIn: 600 });
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    const b = verification.extend({ password }).parse(req.body);
    await consumeCode(b, "reset");
    const u = await User.findOneAndUpdate(
      { email: b.email },
      {
        $set: { passwordHash: await bcrypt.hash(b.password, 12) },
        $inc: { sessionVersion: 1 },
      },
      { returnDocument: "after" },
    );
    if (!u) throw fail(400, "Unable to reset password");
    await Session.deleteMany({ userId: u._id });
    res.clearCookie("wayfare_session", cookieOptions());
    res.json({ message: "Password updated. Sign in with your new password." });
  });
  app.get("/api/auth/me", requireUser, (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );
  app.post("/api/auth/logout", async (req, res) => {
    if (req.cookies.wayfare_session)
      await Session.deleteOne({
        tokenHash: hashToken(req.cookies.wayfare_session),
      });
    res.clearCookie("wayfare_session", cookieOptions());
    res.json({ message: "Signed out" });
  });
  app.use("/api/account", authLimit);
  accountRoutes(app, {
    requireUser,
    signIn,
    publicUser,
    cookieOptions,
    rates,
    googleExchange,
    geocoder,
  });
  app.use("/api/trips", requireUser);
  const serialize = async (t, u) => {
    if (!t) throw fail(404, "Trip not found");
    const users = await User.find({
      _id: { $in: [t.owner, ...(t.members || [])] },
    }).select("name email");
    const members = users.map((m) => ({
      id: String(m._id),
      name: m.name,
      email: m.email,
    }));
    const code = t.data.currency || "INR";
    const expenses = (t.data.expenses || []).map((e) => ({
      ...e,
      paidBy: e.paidBy || String(t.owner),
      shares: e.shares || [{ userId: String(t.owner), amount: e.amount }],
    }));
    return {
      ...t.data,
      expenses,
      currency: code,
      id: t.id,
      revision: t.revision || 0,
      ownerId: String(t.owner),
      members,
      invitations: String(t.owner) === String(u._id) ? t.invitations : [],
      ...balances(expenses, code, members),
    };
  };
  app.get("/api/trips", async (req, res) => {
    const ts = await Trip.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    }).sort({ createdAt: -1 });
    res.json({
      trips: await Promise.all(ts.map((t) => serialize(t, req.user))),
    });
  });
  app.post("/api/trips", async (req, res) => {
    const body = tripSchema.parse(req.body),
      data = generateItinerary(body);
    data.currency = body.currency;
    data.location = body.location;
    data.timeZone = body.timeZone;
    data.preferences = body.preferences;
    // Replace the generic placeholder days with places for the entered
    // destination (day-wise stops, meals, a hotel) and recommendation lists.
    const plan = await planTrip({
      body,
      geocoder: geocoder || geo,
      logger,
    });
    if (plan) {
      data.days = plan.days;
      data.location = body.location || plan.location;
      data.recommendations = plan.recommendations;
    }
    data.packing = [
      "Passport / ID",
      "Tickets and reservations",
      "Medication",
      "Chargers",
      "Comfortable shoes",
    ].map((label) => ({ id: randomUUID(), label, checked: false }));
    data.id = randomUUID();
    const t = await Trip.create({ owner: req.user._id, id: data.id, data });
    res.status(201).json({ trip: await serialize(t, req.user) });
  });
  app.use("/api/trips/:id", async (req, res, next) => {
    const t = await Trip.findOne({
      id: req.params.id,
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    });
    if (!t) throw fail(404, "Trip not found");
    req.trip = t;
    next();
  });
  tripFeatures(app, { serialize });
  app.delete("/api/trips/:id", async (req, res) => {
    if (String(req.trip.owner) !== String(req.user._id))
      throw fail(403, "Only the owner can delete a trip");
    await Document.deleteMany({ tripId: req.trip.id });
    await Trip.deleteOne({ _id: req.trip._id });
    res.json({ message: "Trip deleted" });
  });
  async function buildExpense(req) {
    const b = expenseSchema.parse(req.body),
      code = req.trip.data.currency || "INR",
      source = b.currency || code;
    const memberIds = [req.trip.owner, ...req.trip.members].map(String),
      paidBy = b.paidBy || String(req.user._id),
      split = b.splitBetween || [String(req.user._id)];
    if (
      !memberIds.includes(paidBy) ||
      new Set(split).size !== split.length ||
      split.some((id) => !memberIds.includes(id))
    )
      throw fail(400, "Choose accepted trip members for payer and split");
    const rate = await rates(
        source,
        code,
        b.date <= today("UTC") ? b.date : undefined,
      ),
      amount = roundMoney(b.amount * rate.rate, code);
    if (amount <= 0 || amount > 1e9)
      throw fail(400, "Converted amount is outside the supported range");
    if (roundMoney(b.amount, source) !== b.amount)
      throw fail(400, "Use valid decimal places for this currency");
    return {
      id: randomUUID(),
      date: b.date,
      description: b.description,
      category: b.category,
      amount,
      currency: code,
      originalAmount: b.amount,
      originalCurrency: source,
      rate: rate.rate,
      rateDate: rate.date,
      rateSource: rate.source,
      paidBy,
      shares: shares(amount, code, split),
    };
  }
  app.post("/api/trips/:id/expenses", async (req, res) => {
    const e = await buildExpense(req);
    const t = await Trip.findOneAndUpdate(
      { _id: req.trip._id, ...revisionFilter(req.trip) },
      {
        $push: { "data.expenses": { $each: [e], $position: 0 } },
        $inc: { revision: 1 },
      },
      { returnDocument: "after" },
    );
    if (!t) throw fail(409, "The trip changed. Refresh before saving.");
    res.status(201).json({ trip: await serialize(t, req.user) });
  });
  app.patch("/api/trips/:id/expenses/:expenseId", async (req, res) => {
    if (
      !(req.trip.data.expenses || []).some((e) => e.id === req.params.expenseId)
    )
      throw fail(404, "Expense not found");
    const e = { ...(await buildExpense(req)), id: req.params.expenseId };
    const t = await Trip.findOneAndUpdate(
      {
        _id: req.trip._id,
        "data.expenses.id": e.id,
        ...revisionFilter(req.trip),
      },
      { $set: { "data.expenses.$": e }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    );
    if (!t) throw fail(409, "The trip changed. Refresh before saving.");
    res.json({ trip: await serialize(t, req.user) });
  });
  app.delete("/api/trips/:id/expenses/:expenseId", async (req, res) => {
    const t = await Trip.findOneAndUpdate(
      { _id: req.trip._id },
      {
        $pull: { "data.expenses": { id: req.params.expenseId } },
        $inc: { revision: 1 },
      },
      { returnDocument: "after" },
    );
    res.json({ trip: await serialize(t, req.user) });
  });
  app.use("/api", (_req, _res, next) => next(fail(404, "Endpoint not found")));
  if (process.env.NODE_ENV === "production") {
    const dist = fileURLToPath(new URL("../dist/", import.meta.url));
    app.use(express.static(dist));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(
        fileURLToPath(new URL("../dist/index.html", import.meta.url)),
      ),
    );
  }
  app.use((err, req, res, next) => {
    const status =
      err instanceof z.ZodError
        ? 400
        : err.code === 11000
          ? 409
          : err.status || 500;
    if (status >= 500 || err.code === 11000) {
      logger.error("[Wayfare API error]", {
        method: req.method,
        path: req.path,
        operation: req.operation || "request",
        name: err.name || "Error",
        code: err.code || err.codeName || "none",
        message: safeErrorMessage(err),
        // Field names reveal index conflicts without logging user values.
        ...(err.keyPattern
          ? { conflictingFields: Object.keys(err.keyPattern) }
          : {}),
      });
    }
    if (res.headersSent) return next(err);
    res.status(status).json({
      ...(err instanceof z.ZodError
        ? {
            fields: Object.fromEntries(
              err.issues.map((i) => [i.path.join("."), i.message]),
            ),
          }
        : {}),
      message:
        err instanceof z.ZodError
          ? err.issues[0].message
          : status === 500
            ? "Something went wrong. Please try again."
            : err.code === 11000
              ? (err.keyPattern?.username ? "This username is taken. Choose another." : "This record already exists")
              : err.message,
    });
  });
  return app;
}
