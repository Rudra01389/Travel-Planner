import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mkdtemp, rm } from "node:fs/promises";
import { createApp } from "./app.js";
import { ensureModelIndexes } from "./indexes.js";
import { User, Trip, Session, Challenge, Document } from "./models.js";
import { createRates, shares, balances } from "./money.js";
import {
  tripSchema,
  today,
  password,
  verification,
} from "../src/lib/validation.js";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.OTP_SECRET = "feature-tests-only-32-characters-secret";
let mongo, dbPath, app;
const codes = new Map();
const send = (agent, method, path, body) =>
  agent[method](`/api${path}`)
    .set("Origin", process.env.CLIENT_ORIGIN)
    .send(body);
const future = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 3);
  return d.toISOString().slice(0, 10);
};
before(async () => {
  dbPath = await mkdtemp(process.cwd() + "/.mongo-features-");
  mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.24" },
    instance: {
      dbPath,
      args: process.platform === "win32" ? [] : ["--nounixsocket"],
    },
  });
  await mongoose.connect(mongo.getUri(), { autoIndex: false });
  await ensureModelIndexes([User, Challenge, Session, Trip, Document]);
  app = createApp({
    mailer: async (email, code) => codes.set(email, code),
    rates: async (from, to, date) => ({
      rate: from === to ? 1 : 83.25,
      date: date || today(),
      source: "Test reference provider",
    }),
  });
});
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (dbPath) await rm(dbPath, { recursive: true, force: true });
});
async function account(email) {
  const a = request.agent(app);
  assert.equal(
    (
      await send(a, "post", "/auth/register", {
        email,
        name: "Feature Person",
        password: "StrongPass123!",
      })
    ).status,
    200,
  );
  const v = await send(a, "post", "/auth/verify-registration", {
    email,
    code: codes.get(email),
  });
  assert.equal(v.status, 201);
  return { agent: a, user: v.body.user };
}
const input = () => ({
  destination: "Mumbai, India",
  startDate: future(),
  endDate: future(),
  travellers: 2,
  budget: 1000,
  currency: "INR",
  location: { lat: 19.07, lon: 72.87, name: "Mumbai" },
});
test("validation rejects past dates, impossible dates, empty budgets and weak passwords", () => {
  for (const p of [
    "short",
    "lowercaseonly123",
    "UPPERCASEONLY123",
    "NoNumbersHere!",
  ])
    assert.equal(password.safeParse(p).success, false);
  assert.equal(password.safeParse("StrongPass123!").success, true);
  assert.equal(
    verification.safeParse({ email: "user@example.com", code: "12 456" })
      .success,
    false,
  );
  for (const change of [
    { startDate: "2020-01-01" },
    { startDate: "2026-02-30" },
    { budget: "" },
    { budget: -1 },
    { currency: "XYZ" },
    { timeZone: "Wrong/Timezone" },
    { currency: "JPY", budget: 1.2 },
  ])
    assert.equal(
      tripSchema.safeParse({ ...input(), ...change }).success,
      false,
    );
  assert.equal(tripSchema.safeParse(input()).success, true);
});
test("live currency adapter caches validated reference rates and fails without fake fallback", async () => {
  let calls = 0;
  const rates = createRates(async (url) => {
    calls++;
    assert.ok(String(url).includes("/v2/rate/USD/INR"));
    return {
      ok: true,
      json: async () => ({ rate: 83.25, date: "2026-10-09" }),
    };
  });
  assert.equal((await rates("USD", "INR")).rate, 83.25);
  await rates("USD", "INR");
  assert.equal(calls, 1);
  const bad = createRates(async () => ({
    ok: true,
    json: async () => ({ rate: -1, date: "bad" }),
  }));
  await assert.rejects(bad("USD", "INR"), /unavailable/);
  assert.equal((await rates("INR", "INR")).rate, 1);
});
test("splits preserve every minor unit and settlements cancel balances", () => {
  const s = shares(0.01, "INR", ["a", "b", "c"]);
  assert.deepEqual(
    s.map((x) => x.amount),
    [0.01, 0, 0],
  );
  assert.deepEqual(
    shares(100, "JPY", ["a", "b", "c"]).map((x) => x.amount),
    [34, 33, 33],
  );
  const result = balances(
    [
      {
        amount: 10.01,
        paidBy: "a",
        shares: shares(10.01, "INR", ["a", "b", "c"]),
      },
    ],
    "INR",
    [{ id: "a" }, { id: "b" }, { id: "c" }],
  );
  assert.equal(
    result.settlements.reduce((sum, x) => sum + Math.round(x.amount * 100), 0),
    667,
  );
  assert.equal(
    result.balances.reduce((sum, x) => sum + Math.round(x.amount * 100), 0),
    0,
  );
});
test("retired invitations and documents, legacy access, converted expenses and owner controls", async () => {
  const a = await account("owner@example.com"),
    b = await account("friend@example.com"),
    stranger = await account("stranger@example.com");
  let t = (await send(a.agent, "post", "/trips", input())).body.trip;
  assert.equal(t.days.length, 1);
  assert.equal((await b.agent.get("/api/trips")).body.trips.length, 0);
  assert.equal((await send(a.agent, "post", `/trips/${t.id}/invite`, { email: b.user.email })).status, 404);
  assert.equal((await b.agent.get("/api/trips/invitations")).status, 404);
  assert.equal((await send(b.agent, "post", `/trips/${t.id}/accept`, {})).status, 404);
  // Preserve access and expense behavior for accounts that shared trips before removal.
  await Trip.updateOne({ id: t.id }, { $addToSet: { members: b.user.id } });
  t = (await b.agent.get("/api/trips")).body.trips[0];
  assert.equal(t.members.length, 2);
  assert.equal(
    (await send(b.agent, "delete", `/trips/${t.id}`, {})).status,
    403,
  );
  assert.equal(
    (await send(b.agent, "patch", `/trips/${t.id}/budget`, { budget: 999 }))
      .status,
    403,
  );
  const body = {
    date: today(),
    description: "Dinner",
    category: "Food",
    amount: 10,
    currency: "USD",
    paidBy: a.user.id,
    splitBetween: [a.user.id, b.user.id],
  };
  const added = await send(b.agent, "post", `/trips/${t.id}/expenses`, body);
  assert.equal(added.status, 201);
  t = added.body.trip;
  let e = t.expenses[0];
  assert.equal(e.amount, 832.5);
  assert.equal(e.originalAmount, 10);
  assert.equal(e.originalCurrency, "USD");
  assert.equal(
    e.shares.reduce((s, x) => s + Math.round(x.amount * 100), 0),
    83250,
  );
  assert.equal(t.settlements[0].amount, 416.25);
  assert.equal(
    (
      await send(b.agent, "post", `/trips/${t.id}/expenses`, {
        ...body,
        splitBetween: [stranger.user.id],
      })
    ).status,
    400,
  );
  assert.equal(
    (await send(a.agent, "delete", `/trips/${t.id}/members/${b.user.id}`, {}))
      .status,
    404,
  );
  t = (
    await send(b.agent, "patch", `/trips/${t.id}/expenses/${e.id}`, {
      ...body,
      amount: 20,
    })
  ).body.trip;
  assert.equal(t.expenses[0].amount, 1665);
  assert.equal(t.settlements[0].amount, 832.5);
  assert.equal((await send(b.agent, "post", `/trips/${t.id}/documents`, {})).status, 404);
  assert.equal(
    (
      await send(b.agent, "delete", "/account", {
        confirmation: "DELETE",
        password: "StrongPass123!",
      })
    ).status,
    409,
  );
  await send(a.agent, "delete", `/trips/${t.id}/expenses/${e.id}`, {});
  assert.equal(
    (await send(a.agent, "delete", `/trips/${t.id}/members/${b.user.id}`, {}))
      .status,
    404,
  );

  assert.equal(
    (await send(a.agent, "delete", `/trips/${t.id}`, {})).status,
    200,
  );
  assert.equal(await Document.countDocuments({ tripId: t.id }), 0);
});
test("itinerary and checklist persist with conflict protection and input limits", async () => {
  const a = await account("editor@example.com");
  let t = (await send(a.agent, "post", "/trips", input())).body.trip;
  const old = t.revision;
  const days = t.days.map((d) => ({
    ...d,
    title: "My custom day",
    activities: [
      {
        id: "one",
        title: "Museum",
        notes: "Bring tickets",
        location: input().location,
      },
    ],
  }));
  let r = await send(a.agent, "patch", `/trips/${t.id}/itinerary`, {
    days,
    revision: old,
  });
  assert.equal(r.status, 200);
  t = r.body.trip;
  assert.equal(t.days[0].title, "My custom day");
  assert.equal(
    (
      await send(a.agent, "patch", `/trips/${t.id}/itinerary`, {
        days,
        revision: old,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await send(a.agent, "patch", `/trips/${t.id}/itinerary`, {
        days: [
          {
            ...days[0],
            activities: [days[0].activities[0], days[0].activities[0]],
          },
        ],
        revision: t.revision,
      })
    ).status,
    400,
  );
  r = await send(a.agent, "patch", `/trips/${t.id}/packing`, {
    items: [{ id: "one", label: "Passport", checked: true }],
    revision: t.revision,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.trip.packing[0].checked, true);
  assert.equal(
    (
      await send(a.agent, "patch", `/trips/${t.id}/packing`, {
        items: [],
        revision: t.revision,
      })
    ).status,
    409,
  );
});
test("profile, secure password change, session invalidation and account deletion", async () => {
  const a = await account("profile@example.com"),
    other = request.agent(app);
  await send(other, "post", "/auth/login", {
    email: a.user.email,
    password: "StrongPass123!",
  });
  const profile = await send(a.agent, "patch", "/account", {
    name: "New Name",
    currency: "EUR",
    timeZone: "Asia/Kolkata",
    preferences: ["Museums"],
  });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.currency, "EUR");
  assert.equal(profile.body.user.passwordHash, undefined);
  assert.equal(
    (
      await send(a.agent, "post", "/account/password", {
        currentPassword: "incorrect",
        password: "NewPassword123!",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await send(a.agent, "post", "/account/password", {
        currentPassword: "StrongPass123!",
        password: "NewPassword123!",
      })
    ).status,
    200,
  );
  assert.equal((await other.get("/api/auth/me")).status, 401);
  assert.equal((await a.agent.get("/api/auth/me")).status, 200);
  await send(a.agent, "post", "/trips", input());
  assert.equal(
    (
      await send(a.agent, "delete", "/account", {
        confirmation: "DELETE",
        password: "wrong",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await send(a.agent, "delete", "/account", {
        confirmation: "DELETE",
        password: "NewPassword123!",
      })
    ).status,
    200,
  );
  assert.equal((await a.agent.get("/api/auth/me")).status, 401);
  assert.equal(await User.countDocuments({ email: a.user.email }), 0);
  assert.equal(await Trip.countDocuments({ owner: a.user.id }), 0);
  assert.equal(await Session.countDocuments({ userId: a.user.id }), 0);
});
test("Google callback rejects state mismatch and verified provider login starts a session", async () => {
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  let exchangeCalls = 0;
  const googleApp = createApp({
    googleExchange: async (code, nonce) => {
      exchangeCalls++;
      assert.equal(code, "good-code");
      assert.ok(nonce);
      return {
        sub: "google-user",
        email: "google-user@gmail.com",
        email_verified: true,
        name: "Google Person",
      };
    },
  });
  const g = request.agent(googleApp);
  let start = await g.get("/api/auth/google");
  assert.equal(start.status, 302);
  const url = new URL(start.headers.location);
  let callback = await g.get(
    `/api/auth/google/callback?state=wrong&code=good-code`,
  );
  assert.match(callback.headers.location, /googleError/);
  assert.equal(exchangeCalls, 0);
  start = await g.get("/api/auth/google");
  const state = new URL(start.headers.location).searchParams.get("state");
  callback = await g.get(
    `/api/auth/google/callback?state=${state}&code=good-code`,
  );
  assert.equal(
    callback.headers.location,
    process.env.CLIENT_ORIGIN + "/dashboard",
  );
  assert.equal(
    (await g.get("/api/auth/me")).body.user.email,
    "google-user@gmail.com",
  );
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
});
test("real place and routing adapters are called with validated coordinates and categories", async () => {
  const seen = [];
  const geoApp = createApp({
    geocoder: async (path, params) => {
      seen.push({ path, params });
      if (path.includes("autocomplete"))
        return {
          results: [
            {
              formatted: "Mumbai, India",
              lat: 19.07,
              lon: 72.87,
              country: "India",
            },
          ],
        };
      if (path.includes("places"))
        return {
          features: [{ properties: { name: "Museum", lat: 19.1, lon: 72.8 } }],
        };
      return { type: "FeatureCollection", features: [] };
    },
  });
  const agent = request.agent(geoApp);
  await send(agent, "post", "/auth/login", {
    email: "editor@example.com",
    password: "StrongPass123!",
  });
  assert.equal(
    (await agent.get("/api/places/search?q=Mumbai")).body.places[0].lat,
    19.07,
  );
  assert.equal(
    (await agent.get("/api/places/nearby?lat=19.07&lon=72.87")).body.places[0]
      .name,
    "Museum",
  );
  assert.equal(
    (await agent.get("/api/places/nearby?lat=999&lon=72")).status,
    400,
  );
  assert.equal(
    (
      await send(agent, "post", "/places/route", {
        points: [input().location, { ...input().location, lat: 19.2 }],
      })
    ).status,
    200,
  );
  assert.match(seen.at(-1).params.waypoints, /19.07,72.87\|19.2,72.87/);
});
