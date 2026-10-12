import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "./app.js";
import { otp, token, hashToken, hashCode } from "./security.js";
import { sendOtp } from "./mail.js";
process.env.OTP_SECRET = "test-key-that-is-at-least-32-characters";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
test("codes, purpose-bound OTP hashes, and opaque session tokens", () => {
  for (let i = 0; i < 100; i++) assert.match(otp(), /^\d{6}$/);
  const raw = token();
  assert.equal(raw.length, 64);
  assert.notEqual(raw, token());
  assert.equal(hashToken(raw).length, 64);
  assert.notEqual(
    hashCode("register:a@example.com", "123456"),
    hashCode("reset:a@example.com", "123456"),
  );
  assert.notEqual(
    hashCode("register:a@example.com", "123456"),
    hashCode("register:b@example.com", "123456"),
  );
});
test("API health, missing session, origin guard, and validation without database access", async () => {
  const app = createApp();
  assert.equal((await request(app).get("/api/health")).status, 200);
  assert.equal((await request(app).get("/api/trips")).status, 401);
  assert.equal((await request(app).get("/api/auth/me")).status, 401);
  assert.equal(
    (
      await request(app)
        .post("/api/auth/register")
        .set("Origin", "https://untrusted.example")
        .send({})
    ).status,
    403,
  );
  const invalid = await request(app)
    .post("/api/auth/register")
    .set("Origin", process.env.CLIENT_ORIGIN)
    .send({ email: "invalid", password: "short", name: "A" });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.body.message);
  const out = await request(app)
    .post("/api/auth/logout")
    .set("Origin", process.env.CLIENT_ORIGIN)
    .send({});
  assert.equal(out.status, 200);
  assert.match(out.headers["set-cookie"][0], /HttpOnly/);
});
test("Brevo REST payload and provider failure handling", async () => {
  const previous = globalThis.fetch;
  process.env.BREVO_API_KEY = "test-only";
  process.env.BREVO_SENDER_EMAIL = "verified@example.com";
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.brevo.com/v3/smtp/email");
      assert.equal(options.headers["api-key"], "test-only");
      const b = JSON.parse(options.body);
      assert.equal(b.to[0].email, "recipient@example.com");
      assert.match(b.textContent, /123456/);
      assert.equal(b.sender.email, "verified@example.com");
      return { ok: true };
    };
    await sendOtp("recipient@example.com", "123456", "register");
    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(
      sendOtp("recipient@example.com", "123456", "reset"),
      /Email delivery failed/,
    );
  } finally {
    globalThis.fetch = previous;
    delete process.env.BREVO_API_KEY;
  }
});

test("routine session checks do not exhaust the login-attempt limit", async () => {
  const app = createApp();
  for (let i = 0; i < 35; i++)
    assert.equal((await request(app).get("/api/auth/me")).status, 401);
  const response = await request(app)
    .post("/api/auth/register")
    .set("Origin", process.env.CLIENT_ORIGIN)
    .send({ email: "bad", password: "short", name: "A" });
  assert.equal(response.status, 400);
});
