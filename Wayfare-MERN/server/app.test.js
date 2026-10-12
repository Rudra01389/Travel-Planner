import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { mkdtemp, rm } from "node:fs/promises";
import { ensureModelIndexes } from "./indexes.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "./app.js";
import { User, Challenge, Session, Trip, Document } from "./models.js";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.OTP_SECRET = "test-only-secret-32-characters-long";
let mongo, app, dbPath;
const warnings = [];
const onWarning = (warning) => {
  if (
    warning.message.includes("[MONGOOSE]") ||
    warning.message.includes("mongoose:")
  )
    warnings.push(warning.message);
};
process.on("warning", onWarning);
const outbox = [];
const post = (agent, url, body) =>
  agent
    .post("/api" + url)
    .set("Origin", process.env.CLIENT_ORIGIN)
    .send(body);
const del = (agent, url) =>
  agent.delete("/api" + url).set("Origin", process.env.CLIENT_ORIGIN);
before(async () => {
  dbPath = await mkdtemp(process.cwd() + "/.mongo-test-");
  mongo = await MongoMemoryServer.create({
    binary: { version: process.env.MONGOMS_VERSION || "7.0.24" },
    instance: {
      dbPath,
      args: process.platform === "win32" ? [] : ["--nounixsocket"],
    },
  });
  await mongoose.connect(mongo.getUri(), { autoIndex: false });
  await User.collection.createIndex(
    { email: 1 },
    { unique: true, name: "users_email_unique" },
  );
  // Reproduce the user's existing database: legacy collections reject this app's format.
  for (const name of [
    "users",
    "challenges",
    "sessions",
    "trips",
    "documents",
  ]) {
    await mongoose.connection.db.createCollection(name, {
      validator: {
        $jsonSchema: { bsonType: "object", required: ["legacyField"] },
      },
      validationLevel: "strict",
      validationAction: "error",
    });
    await mongoose.connection.db
      .collection(name)
      .insertOne({ legacyField: "existing-record" });
  }
  await ensureModelIndexes([User, Challenge, Session, Trip, Document]);
  app = createApp({
    mailer: async (email, code, purpose) =>
      outbox.push({ email, code, purpose }),
  });
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  if (dbPath) await rm(dbPath, { recursive: true, force: true });
  process.off("warning", onWarning);
});
const codeFor = (email) => outbox.findLast((x) => x.email === email).code;
async function register(agent, email) {
  assert.equal(
    (
      await post(agent, "/auth/register", {
        email,
        name: "Test Traveller",
        password: "StrongPass123!",
      })
    ).status,
    200,
  );
  const r = await post(agent, "/auth/verify-registration", {
    email,
    code: codeFor(email),
  });
  assert.equal(r.status, 201);
  return r;
}
test("registration, password-only login, ownership, Mongo persistence, reset and logout", async () => {
  const alice = request.agent(app),
    bob = request.agent(app);
  const a = "alice@example.com",
    b = "bob@example.com";
  assert.equal((await alice.get("/api/trips")).status, 401);
  assert.equal(
    (await request(app).post("/api/auth/register").send({})).status,
    403,
  );
  await register(alice, a);
  await register(bob, b);
  assert.equal((await alice.get("/api/auth/me")).body.user.email, a);
  assert.equal(
    (
      await post(alice, "/auth/verify-registration", {
        email: a,
        code: codeFor(a),
      })
    ).status,
    400,
  );
  const data = {
    destination: "Kyoto, Japan",
    startDate: "2026-11-01",
    endDate: "2026-11-06",
    travellers: 2,
    budget: 150000,
  };
  assert.equal(
    (await post(alice, "/trips", { ...data, endDate: "2026-10-01" })).status,
    400,
  );
  const created = await post(alice, "/trips", data);
  assert.equal(created.status, 201);
  const id = created.body.trip.id;
  assert.equal((await bob.get("/api/trips")).body.trips.length, 0);
  assert.equal((await post(bob, `/trips/${id}/expenses`, {})).status, 404);
  let exp = await post(alice, `/trips/${id}/expenses`, {
    date: "2026-11-01",
    description: "Lunch",
    category: "Food",
    amount: 500,
  });
  assert.equal(exp.status, 201);
  assert.equal(
    (
      await post(alice, `/trips/${id}/expenses`, {
        date: "2026-11-01",
        description: "Bad",
        category: "Food",
        amount: -5,
      })
    ).status,
    400,
  );
  assert.equal(
    (await alice.get("/api/trips")).body.trips[0].expenses[0].amount,
    500,
  );
  assert.equal(
    (await del(alice, `/trips/${id}/expenses/${exp.body.trip.expenses[0].id}`))
      .body.trip.expenses.length,
    0,
  );
  assert.equal((await post(alice, `/trips/${id}/documents`, { name: "ticket.pdf" })).status, 404);
  const fresh = request.agent(createApp({ mailer: async () => {} }));
  const n = outbox.length;
  assert.equal(
    (await post(fresh, "/auth/login", { email: a, password: "StrongPass123!" }))
      .status,
    200,
  );
  assert.equal(outbox.length, n, "login must not send OTP");
  assert.equal((await fresh.get("/api/trips")).body.trips.length, 1);
  assert.equal(
    (await post(alice, "/auth/forgot-password", { email: a })).status,
    200,
  );
  assert.equal(
    (await post(alice, "/auth/forgot-password", { email: a })).status,
    429,
  );
  assert.equal(
    (
      await post(alice, "/auth/reset-password", {
        email: a,
        code: codeFor(a),
        password: "Replacement456!",
      })
    ).status,
    200,
  );
  assert.equal((await fresh.get("/api/auth/me")).status, 401);
  assert.equal(
    (await post(alice, "/auth/login", { email: a, password: "StrongPass123!" }))
      .status,
    401,
  );
  assert.equal(
    (
      await post(alice, "/auth/login", {
        email: a,
        password: "Replacement456!",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await post(alice, "/auth/reset-password", {
        email: a,
        code: codeFor(a),
        password: "Replacement789!",
      })
    ).status,
    400,
  );
  await post(alice, "/auth/logout", {});
  assert.equal((await alice.get("/api/trips")).status, 401);
});
test("expired codes, maximum attempts, resend replacement, delivery failure", async () => {
  // Isolated app gives each test a fresh IP rate-limit store.
  const a = request.agent(
    createApp({
      mailer: async (email, code, purpose) =>
        outbox.push({ email, code, purpose }),
    }),
  );
  const email = "limits@example.com";
  const body = { email, name: "Test User", password: "StrongPass123!" };
  await post(a, "/auth/register", body);
  const old = codeFor(email);
  await Challenge.updateOne(
    { email },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );
  assert.equal(
    (await post(a, "/auth/verify-registration", { email, code: old })).status,
    400,
  );
  await Challenge.updateOne(
    { email },
    { $set: { sentAt: new Date(Date.now() - 61000) } },
  );
  await post(a, "/auth/register", body);
  const good = codeFor(email),
    wrong = good === "111111" ? "222222" : "111111";
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await post(a, "/auth/verify-registration", { email, code: wrong }))
        .status,
      400,
    );
  assert.equal(
    (await post(a, "/auth/verify-registration", { email, code: good })).status,
    400,
  );
  await Challenge.updateOne(
    { email },
    { $set: { sentAt: new Date(Date.now() - 61000) } },
  );
  assert.equal((await post(a, "/auth/register", body)).status, 200);
  assert.equal(
    (
      await post(a, "/auth/verify-registration", {
        email,
        code: codeFor(email),
      })
    ).status,
    201,
  );
  const failing = request.agent(
    createApp({
      mailer: async () => {
        throw Error("provider unavailable");
      },
    }),
  );
  assert.equal(
    (
      await post(failing, "/auth/register", {
        ...body,
        email: "delivery@example.com",
      })
    ).status,
    502,
  );
  assert.equal(
    await Challenge.countDocuments({ email: "delivery@example.com" }),
    0,
  );
});

test("MongoDB flows produce no Mongoose deprecation warnings", async () => {
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(warnings, []);
  const indexes = await User.collection.listIndexes().toArray();
  assert.ok(
    indexes.some(
      (index) => index.name === "users_email_unique" && index.unique,
    ),
  );
});

test("a database rejection during OTP verification is logged safely with its operation", async () => {
  const logs = [];
  const diagnosticApp = createApp({
    mailer: async (email, code, purpose) =>
      outbox.push({ email, code, purpose }),
    logger: { error: (...args) => logs.push(args) },
  });
  const agent = request.agent(diagnosticApp),
    email = "diagnostic@example.com";
  await post(agent, "/auth/register", {
    email,
    name: "Test Person",
    password: "StrongPass123!",
  });
  // Reproduce a pre-existing database validator incompatible with the account schema.
  await mongoose.connection.db.command({
    collMod: User.collection.collectionName,
    validator: {
      $jsonSchema: { bsonType: "object", required: ["legacyField"] },
    },
    validationLevel: "strict",
    validationAction: "error",
  });
  try {
    const response = await post(agent, "/auth/verify-registration", {
      email,
      code: codeFor(email),
    });
    assert.equal(response.status, 500);
    assert.equal(
      response.body.message,
      "Something went wrong. Please try again.",
    );
    assert.equal(logs.length, 1);
    assert.equal(logs[0][1].code, 121);
    assert.equal(logs[0][1].operation, "create-account");
    const text = JSON.stringify(logs);
    assert.ok(!text.includes(codeFor(email)));
    assert.ok(!text.includes("StrongPass123!"));
    assert.ok(!text.includes(process.env.OTP_SECRET));
    assert.ok(!text.includes(email));
  } finally {
    await mongoose.connection.db.command({
      collMod: User.collection.collectionName,
      validator: {},
      validationLevel: "strict",
    });
  }
});

test("Wayfare storage leaves all existing collections and validators untouched", async () => {
  const expected = [
    [User, "wayfare_users"],
    [Challenge, "wayfare_otp_challenges"],
    [Session, "wayfare_sessions"],
    [Trip, "wayfare_trips"],
    [Document, "wayfare_documents"],
  ];
  for (const [model, name] of expected)
    assert.equal(model.collection.collectionName, name);
  for (const name of [
    "users",
    "challenges",
    "sessions",
    "trips",
    "documents",
  ]) {
    const collection = mongoose.connection.db.collection(name);
    assert.equal(await collection.countDocuments(), 1);
    assert.equal((await collection.findOne({})).legacyField, "existing-record");
    const info = (
      await mongoose.connection.db.listCollections({ name }).toArray()
    )[0];
    assert.deepEqual(info.options.validator.$jsonSchema.required, [
      "legacyField",
    ]);
    await assert.rejects(
      collection.insertOne({ name: "Wrong format" }),
      (error) => error.code === 121,
    );
  }
});

test("username registration persists through email verification and supports existing-user setup", async () => {
  const agent = request.agent(app), address = "username-flow@example.com";
  const body = { name: "Username Traveller", username: "New_Traveller", email: address, password: "StrongPass123!" };
  assert.equal((await post(agent, "/auth/register", body)).status, 200);
  const verified = await post(agent, "/auth/verify-registration", { email: address, code: codeFor(address) });
  assert.equal(verified.status, 201);
  assert.equal(verified.body.user.username, "new_traveller");
  const stored = await User.findOne({ email: address });
  assert.equal(stored.username, "new_traveller");
  assert.equal((await post(request.agent(app), "/auth/login", { email: "NEW_TRAVELLER", password: body.password })).status, 200);
  assert.equal((await post(request.agent(app), "/auth/login", { email: address, password: body.password })).status, 200);
  assert.equal((await post(request.agent(app), "/auth/register", { ...body, email: "another-username@example.com" })).status, 409);
  const old = request.agent(app);
  await register(old, "old-username@example.com");
  const patch = (username) => old.patch("/api/account").set("Origin", process.env.CLIENT_ORIGIN).send({ name: "Old Traveller", username, currency: "INR", timeZone: "UTC", preferences: [] });
  assert.equal((await patch("NEW_TRAVELLER")).status, 409);
  assert.equal((await patch("OLD_TRAVELLER")).status, 200);
  assert.equal((await post(request.agent(app), "/auth/login", { email: "old_traveller", password: body.password })).status, 200);
});
