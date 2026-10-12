import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { User, Challenge, Session, Trip, Document } from "./models.js";
import { ensureModelIndexes } from "./indexes.js";
import { readConfig, startupMessage } from "./config.js";
// Always load the project-root .env, including when started from server/.
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
async function start() {
  try {
    const config = readConfig();
    process.env.CLIENT_ORIGIN = config.origin;
    await mongoose.connect(config.mongoUri, {
      autoIndex: false,
      dbName: config.dbName,
      serverSelectionTimeoutMS: 15000,
    });
    await ensureModelIndexes([User, Challenge, Session, Trip, Document]);
    const server = createApp().listen(config.port);
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    console.log(`Wayfare server listening on port ${config.port}`);
    console.log(
      "MongoDB connected. Registration and password-reset email delivery is configured.",
    );
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () =>
        server.close(async () => {
          await mongoose.disconnect();
          process.exit(0);
        }),
      );
  } catch (error) {
    console.error(`Wayfare could not start: ${startupMessage(error)}`);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  }
}
await start();
