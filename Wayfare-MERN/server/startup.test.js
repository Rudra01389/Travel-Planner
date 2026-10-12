import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

async function freePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}
test(
  "actual server starts from server/ and answers API health without warnings",
  { timeout: 45000 },
  async () => {
    let mongo, child;
    const dbPath = await mkdtemp(process.cwd() + "/.mongo-startup-");
    try {
      mongo = await MongoMemoryServer.create({
        binary: { version: process.env.MONGOMS_VERSION || "7.0.24" },
        instance: {
          dbPath,
          args: process.platform === "win32" ? [] : ["--nounixsocket"],
        },
      });
      const port = await freePort();
      child = spawn(process.execPath, ["index.js"], {
        cwd: fileURLToPath(new URL(".", import.meta.url)),
        env: {
          ...process.env,
          MONGODB_URI: mongo.getUri(),
          MONGODB_DB_NAME: "startup_test",
          OTP_SECRET: "test-only-secret-with-more-than-32-characters",
          CLIENT_ORIGIN: "http://localhost:5173",
          BREVO_API_KEY: "test-only-not-sent",
          BREVO_SENDER_EMAIL: "test@example.com",
          PORT: String(port),
          NODE_ENV: "development",
        },
      });
      let output = "",
        errors = "";
      child.stdout.on("data", (b) => {
        output += b;
      });
      child.stderr.on("data", (b) => {
        errors += b;
      });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Server startup timed out")),
          20000,
        );
        const onData = () => {
          if (output.includes("Wayfare server listening")) {
            clearTimeout(timer);
            resolve();
          }
        };
        child.stdout.on("data", onData);
        child.once("error", (e) => {
          clearTimeout(timer);
          reject(e);
        });
        child.once("exit", (code) => {
          clearTimeout(timer);
          reject(new Error(`Server exited before startup: ${code}. ${errors}`));
        });
      });
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
      assert.match(output, /MongoDB connected/);
      assert.equal(errors, "");
    } finally {
      if (child && child.exitCode === null) {
        child.kill("SIGTERM");
        await new Promise((resolve) => child.once("exit", resolve));
      }
      await mongo?.stop();
      await rm(dbPath, { recursive: true, force: true });
    }
  },
);
