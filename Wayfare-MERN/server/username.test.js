import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "./app.js";
import { User, Session } from "./models.js";
import { username, registration } from "../src/lib/validation.js";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
const post = (app, body) => request(app).post("/api/auth/login").set("Origin", process.env.CLIENT_ORIGIN).send(body);

test("usernames normalize and reject ambiguous or invalid identifiers; old registrations remain compatible", () => {
  assert.equal(username.parse("  Aayush_123  "), "aayush_123");
  for (const bad of ["ab", "with space", "a@b.com", "a.b", "a".repeat(31)]) assert.equal(username.safeParse(bad).success, false);
  assert.equal(registration.safeParse({ name: "Old User", email: "old@example.com", password: "StrongPass123!" }).success, true);
  assert.ok(User.schema.indexes().some(([keys, options]) => keys.username === 1 && options.unique && options.sparse));
});

test("email and case-insensitive username logins use the same password and session flow", async (t) => {
  const user = { _id: "507f1f77bcf86cd799439011", name: "Aayush", email: "aayush@example.com", username: "aayush_123", sessionVersion: 0, passwordHash: await bcrypt.hash("StrongPass123!", 4) };
  const queries = [], sessions = [];
  t.mock.method(User, "findOne", async (query) => { queries.push(query); return user; });
  t.mock.method(Session, "create", async (session) => { sessions.push(session); return session; });
  const app = createApp();
  for (const email of ["AAYUSH_123", "aayush@example.com"]) {
    const response = await post(app, { email, password: "StrongPass123!" });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.username, "aayush_123");
    assert.ok(response.headers["set-cookie"][0].includes("HttpOnly"));
  }
  assert.deepEqual(queries, [{ username: "aayush_123" }, { email: "aayush@example.com" }]);
  assert.equal(sessions.length, 2);
  assert.equal((await post(app, { email: "aayush_123", password: "wrong" })).status, 401);
  assert.equal(sessions.length, 2, "incorrect passwords must not create sessions");
});

test("existing users can save a normalized username; duplicate usernames return a useful conflict", async (t) => {
  let conflict = false;
  const user = { _id: "507f1f77bcf86cd799439012", name: "Existing User", email: "existing@example.com", sessionVersion: 0, async save() { if (conflict) throw Object.assign(new Error("duplicate"), { code: 11000, keyPattern: { username: 1 } }); } };
  t.mock.method(Session, "findOne", async () => ({ userId: user._id, version: 0 }));
  t.mock.method(User, "findById", async () => user);
  const app = createApp({ logger: { error() {} } });
  const save = () => request(app).patch("/api/account").set("Origin", process.env.CLIENT_ORIGIN).set("Cookie", "wayfare_session=test").send({ name: user.name, username: "  New_User  ", currency: "INR", timeZone: "UTC", preferences: [] });
  const result = await save();
  assert.equal(result.status, 200);
  assert.equal(result.body.user.username, "new_user");
  conflict = true;
  const duplicate = await save();
  assert.equal(duplicate.status, 409);
  assert.match(duplicate.body.message, /username is taken/);
});
