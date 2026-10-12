import { test } from "node:test";
import assert from "node:assert/strict";
import { readConfig, startupMessage } from "./config.js";
const valid = {
  MONGODB_URI: "mongodb://localhost:27017/wayfare?tls=true",
  OTP_SECRET: "secret-with-at-least-thirty-two-characters",
  CLIENT_ORIGIN: "http://localhost:5173/",
  BREVO_SENDER_EMAIL: "test@example.com",
  BREVO_API_KEY: "test-key",
  PORT: "5000",
  MONGODB_DB_NAME: "wayfare_db",
};
test("configuration accepts API or SMTP and normalizes the client origin", () => {
  const c = readConfig(valid);
  assert.equal(c.origin, "http://localhost:5173");
  assert.equal(c.port, 5000);
  assert.equal(c.dbName, "wayfare_db");
  assert.doesNotThrow(() =>
    readConfig({
      ...valid,
      BREVO_API_KEY: "",
      BREVO_SMTP_USER: "test",
      BREVO_SMTP_KEY: "smtp-key",
    }),
  );
});
test("configuration rejects missing secrets, invalid ports and malformed TLS values", () => {
  assert.throws(
    () => readConfig({ ...valid, OTP_SECRET: "" }),
    /Missing OTP_SECRET/,
  );
  assert.throws(
    () => readConfig({ ...valid, OTP_SECRET: "short" }),
    /32 random/,
  );
  for (const port of ["5k", "0", "65536", "5000abc"])
    assert.throws(() => readConfig({ ...valid, PORT: port }), /PORT must/);
  assert.throws(
    () =>
      readConfig({
        ...valid,
        MONGODB_URI: "mongodb://localhost/db?ssl=truewayfare_db",
      }),
    /invalid ssl/,
  );
  assert.throws(
    () => readConfig({ ...valid, CLIENT_ORIGIN: "http://localhost:5173/path" }),
    /only the protocol/,
  );
});
test("startup messages explain failures and do not expose database credentials", () => {
  assert.match(startupMessage({ code: "EADDRINUSE" }), /already in use/);
  assert.match(startupMessage({ code: 18 }), /authentication failed/);
  assert.match(
    startupMessage({ name: "MongooseServerSelectionError" }),
    /could not be reached/,
  );
  assert.doesNotMatch(
    startupMessage({ message: "Bad mongodb://user:private-password@host/db" }),
    /private-password/,
  );
});
