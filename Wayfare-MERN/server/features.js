import { z } from "zod";
import bcrypt from "bcryptjs";
import { User, Trip, Session, Challenge, Document } from "./models.js";
import {
  email,
  password,
  profileSchema,
  currency,
  location,
  itinerarySchema,
  packingSchema,
} from "../src/lib/validation.js";
import { googleConfig, googleIdentity, geo, place } from "./integrations.js";
import { roundMoney } from "./money.js";
import { token, hashToken } from "./security.js";
const fail = (status, message) => Object.assign(Error(message), { status });
export function accountRoutes(
  app,
  {
    requireUser,
    signIn,
    publicUser,
    cookieOptions,
    rates,
    googleExchange = googleIdentity,
    geocoder = geo,
  },
) {
  app.get("/api/config", (_req, res) =>
    res.json({
      googleEnabled: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
      mapsEnabled: !!process.env.GEOAPIFY_API_KEY,
    }),
  );
  app.get("/api/auth/google", (_req, res) => {
    const c = googleConfig();
    if (!c.clientId || !c.clientSecret)
      throw fail(503, "Google login needs OAuth credentials in .env.");
    const state = token(),
      nonce = token();
    res.cookie("wayfare_oauth", `${state}.${nonce}`, {
      ...cookieOptions(),
      maxAge: 600000,
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    for (const [k, v] of Object.entries({
      client_id: c.clientId,
      redirect_uri: c.redirect,
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      prompt: "select_account",
    }))
      url.searchParams.set(k, v);
    res.redirect(url.href);
  });
  app.get("/api/auth/google/callback", async (req, res) => {
    const saved = req.cookies.wayfare_oauth;
    res.clearCookie("wayfare_oauth", cookieOptions());
    try {
      const [state, nonce] = (saved || "").split(".");
      if (
        !state ||
        typeof req.query.state !== "string" ||
        hashToken(req.query.state) !== hashToken(state) ||
        typeof req.query.code !== "string" ||
        req.query.code.length > 4000
      )
        throw fail(400, "Invalid sign-in request");
      const p = await googleExchange(req.query.code, nonce);
      if (!p.email_verified || !p.sub || !p.email)
        throw fail(400, "Email not verified");
      const address = email.parse(p.email);
      if (!address.endsWith("@gmail.com") && !p.hd)
        throw fail(400, "Verify this email through registration instead");
      let u = await User.findOne({ googleSub: p.sub });
      if (!u) {
        u = await User.findOne({ email: address });
        if (u) {
          if (!address.endsWith("@gmail.com") && !p.hd)
            throw fail(400, "Sign in with your email and password");
          if (u.googleSub && u.googleSub !== p.sub)
            throw fail(400, "Account already linked");
          u.googleSub = p.sub;
          await u.save();
        } else
          u = await User.create({
            email: address,
            name: String(p.name || address.split("@")[0]).slice(0, 80),
            googleSub: p.sub,
          });
      }
      await signIn(res, u);
      res.redirect(`${process.env.CLIENT_ORIGIN}/dashboard`);
    } catch {
      res.redirect(`${process.env.CLIENT_ORIGIN}/login?googleError=1`);
    }
  });
  app.get("/api/currencies/rate", requireUser, async (req, res) => {
    const from = currency.parse(req.query.from),
      to = currency.parse(req.query.to);
    res.json({ from, to, ...(await rates(from, to)) });
  });
  app.get("/api/places/search", requireUser, async (req, res) => {
    const q = z.string().trim().min(2).max(120).parse(req.query.q);
    const data = await geocoder("v1/geocode/autocomplete", {
      text: q,
      type: "city",
      format: "json",
      limit: 6,
    });
    res.json({ places: (data.results || []).map(place) });
  });
  app.get("/api/places/nearby", requireUser, async (req, res) => {
    const p = location.parse({
      name: "Destination",
      lat: Number(req.query.lat),
      lon: Number(req.query.lon),
    });
    const category = z
      .enum(["tourism", "catering.restaurant", "leisure.park", "entertainment"])
      .parse(req.query.category || "tourism");
    const data = await geocoder("v2/places", {
      categories: category,
      filter: `circle:${p.lon},${p.lat},10000`,
      bias: `proximity:${p.lon},${p.lat}`,
      limit: 20,
    });
    res.json({ places: (data.features || []).map((f) => place(f.properties)) });
  });
  app.post("/api/places/route", requireUser, async (req, res) => {
    const b = z
      .object({
        points: z.array(location).min(2).max(10),
        mode: z.enum(["walk", "drive", "bicycle"]).default("walk"),
      })
      .parse(req.body);
    const route = await geocoder("v1/routing", {
      waypoints: b.points.map((p) => `${p.lat},${p.lon}`).join("|"),
      mode: b.mode,
    });
    res.json({ route });
  });
  app.patch("/api/account", requireUser, async (req, res) => {
    const b = profileSchema.parse(req.body);
    Object.assign(req.user, b);
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  });
  app.post("/api/account/password", requireUser, async (req, res) => {
    const b = z
      .object({ currentPassword: z.string().min(1).max(200), password })
      .parse(req.body);
    if (!req.user.passwordHash)
      throw fail(
        400,
        "For a Google-only account, use Forgot password to set your first password.",
      );
    if (!(await bcrypt.compare(b.currentPassword, req.user.passwordHash)))
      throw fail(400, "Current password is incorrect");
    if (b.currentPassword === b.password)
      throw fail(400, "Choose a different new password");
    const u = await User.findOneAndUpdate(
      { _id: req.user._id, sessionVersion: req.user.sessionVersion },
      {
        $set: { passwordHash: await bcrypt.hash(b.password, 12) },
        $inc: { sessionVersion: 1 },
      },
      { returnDocument: "after" },
    );
    if (!u) throw fail(409, "Your account changed. Sign in again.");
    await Session.deleteMany({ userId: u._id });
    await signIn(res, u);
    res.json({
      message: "Password changed. Other devices have been signed out.",
    });
  });
  app.delete("/api/account", requireUser, async (req, res) => {
    const b = z
      .object({
        confirmation: z.literal("DELETE"),
        password: z.string().max(200).optional(),
      })
      .parse(req.body);
    if (req.user.passwordHash) {
      if (
        !b.password ||
        !(await bcrypt.compare(b.password, req.user.passwordHash))
      )
        throw fail(400, "Enter your current password to delete your account");
    } else {
      const session = await Session.findOne({
        tokenHash: hashToken(req.cookies.wayfare_session),
      });
      if (
        !session ||
        Date.now() - (+session.expiresAt - 7 * 86400000) > 10 * 60000
      )
        throw fail(
          403,
          "Sign in with Google again before deleting your account",
        );
    }
    const participating = await Trip.find({
      members: req.user._id,
      owner: { $ne: req.user._id },
    });
    if (
      participating.some((t) =>
        (t.data.expenses || []).some(
          (e) =>
            e.paidBy === String(req.user._id) ||
            (e.shares || []).some((s) => s.userId === String(req.user._id)),
        ),
      )
    )
      throw fail(
        409,
        "Ask the trip owner to remove expenses involving you before deleting your account.",
      );
    const owned = await Trip.find({ owner: req.user._id });
    await Document.deleteMany({ tripId: { $in: owned.map((t) => t.id) } });
    await Trip.deleteMany({ owner: req.user._id });
    await Trip.updateMany(
      { members: req.user._id },
      { $pull: { members: req.user._id } },
    );
    await Trip.updateMany(
      { invitations: req.user.email },
      { $pull: { invitations: req.user.email } },
    );
    await Challenge.deleteMany({ email: req.user.email });
    await Session.deleteMany({ userId: req.user._id });
    await User.deleteOne({ _id: req.user._id });
    res.clearCookie("wayfare_session", cookieOptions());
    res.json({ message: "Account and owned trips deleted." });
  });
}
export function invitationRoutes(app, { serialize }) {
  app.get("/api/trips/invitations", async (req, res) => {
    const trips = await Trip.find({ invitations: req.user.email });
    res.json({
      invitations: trips.map((t) => ({
        id: t.id,
        destination: t.data.destination,
        startDate: t.data.startDate,
      })),
    });
  });
  app.post("/api/trips/:id/accept", async (req, res) => {
    const t = await Trip.findOneAndUpdate(
      { id: req.params.id, invitations: req.user.email },
      {
        $addToSet: { members: req.user._id },
        $pull: { invitations: req.user.email },
        $inc: { revision: 1 },
      },
      { returnDocument: "after" },
    );
    if (!t) throw fail(404, "Invitation not found");
    res.json({ trip: await serialize(t, req.user) });
  });
  app.post("/api/trips/:id/decline", async (req, res) => {
    await Trip.updateOne(
      { id: req.params.id },
      { $pull: { invitations: req.user.email } },
    );
    res.json({ message: "Invitation declined" });
  });
}
export function tripFeatures(app, { serialize }) {
  const owner = (req) => {
    if (String(req.trip.owner) !== String(req.user._id))
      throw fail(403, "Only the trip owner can do this");
  };
  app.patch("/api/trips/:id/itinerary", async (req, res) => {
    const b = itinerarySchema.parse(req.body);
    if (b.days.length !== req.trip.data.days.length)
      throw fail(400, "Keep one day for each trip date");
    const t = await Trip.findOneAndUpdate(
      {
        _id: req.trip._id,
        ...(b.revision === 0
          ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] }
          : { revision: b.revision }),
      },
      { $set: { "data.days": b.days }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    );
    if (!t)
      throw fail(
        409,
        "The itinerary changed on another device. Reload before saving.",
      );
    res.json({ trip: await serialize(t, req.user) });
  });
  app.patch("/api/trips/:id/packing", async (req, res) => {
    const b = packingSchema
      .safeExtend({ revision: z.number().int().nonnegative() })
      .parse(req.body);
    const t = await Trip.findOneAndUpdate(
      {
        _id: req.trip._id,
        ...(b.revision === 0
          ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] }
          : { revision: b.revision }),
      },
      { $set: { "data.packing": b.items }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    );
    if (!t) throw fail(409, "This checklist changed. Reload before saving.");
    res.json({ trip: await serialize(t, req.user) });
  });
  app.patch("/api/trips/:id/budget", async (req, res) => {
    owner(req);
    const b = z
      .object({ budget: z.coerce.number().positive().max(1e9) })
      .parse(req.body);
    const t = await Trip.findOneAndUpdate(
      { _id: req.trip._id },
      {
        $set: {
          "data.budget": roundMoney(b.budget, req.trip.data.currency || "INR"),
        },
        $inc: { revision: 1 },
      },
      { returnDocument: "after" },
    );
    res.json({ trip: await serialize(t, req.user) });
  });
  app.post("/api/trips/:id/invite", async (req, res) => {
    owner(req);
    const b = z.object({ email }).parse(req.body);
    const members = await User.find({
      _id: { $in: [req.trip.owner, ...req.trip.members] },
    });
    if (members.some((u) => u.email === b.email))
      throw fail(409, "This person is already a member");
    if (req.trip.members.length + req.trip.invitations.length >= 99)
      throw fail(400, "A trip can have up to 100 people");
    const t = await Trip.findOneAndUpdate(
      { _id: req.trip._id },
      { $addToSet: { invitations: b.email }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    );
    res.json({
      trip: await serialize(t, req.user),
      message:
        "Invitation is available in their Wayfare dashboard when they sign in.",
    });
  });
  app.delete("/api/trips/:id/invitations/:email", async (req, res) => {
    owner(req);
    const address = email.parse(req.params.email);
    const t = await Trip.findOneAndUpdate(
      { _id: req.trip._id },
      { $pull: { invitations: address }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    );
    res.json({ trip: await serialize(t, req.user) });
  });
  app.delete("/api/trips/:id/members/:memberId", async (req, res) => {
    owner(req);
    const id = z
      .string()
      .regex(/^[a-f0-9]{24}$/i, "Invalid member ID")
      .parse(req.params.memberId);
    if (id === String(req.trip.owner))
      throw fail(400, "The owner cannot be removed");
    if (
      (req.trip.data.expenses || []).some(
        (e) => e.paidBy === id || (e.shares || []).some((s) => s.userId === id),
      )
    )
      throw fail(409, "Remove expenses involving this member first");
    const t = await Trip.findOneAndUpdate(
      {
        _id: req.trip._id,
        $or: [
          { revision: req.trip.revision || 0 },
          ...(req.trip.revision ? [] : [{ revision: { $exists: false } }]),
        ],
      },
      { $pull: { members: id }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    );
    if (!t)
      throw fail(409, "The trip changed. Refresh before removing a member.");
    res.json({ trip: await serialize(t, req.user) });
  });
}
