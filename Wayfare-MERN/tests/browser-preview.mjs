// Disposable local UI preview: never use this harness for deployment.
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { mkdtemp, rm } from "node:fs/promises";
import express from "express";
import { createApp } from "../server/app.js";
import { User, Session } from "../server/models.js";
import { token, hashToken } from "../server/security.js";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5481";
process.env.OTP_SECRET = "disposable-browser-preview-secret-32";
process.env.NODE_ENV = "production";
const path = await mkdtemp(process.cwd() + "/.mongo-preview-"),
  mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.24" },
    instance: {
      dbPath: path,
      args: process.platform === "win32" ? [] : ["--nounixsocket"],
    },
  });
await mongoose.connect(mongo.getUri());
const user = await User.create({
    name: "Preview Traveller",
    email: "preview@example.com",
    currency: "INR",
  }),
  session = token();
await Session.create({
  tokenHash: hashToken(session),
  userId: user._id,
  version: 0,
  expiresAt: new Date(Date.now() + 86400000),
});
const app = express();
app.use((req, _res, next) => {
  req.headers.cookie = `wayfare_session=${session}`;
  next();
});
app.use(
  createApp({
    rates: async (from, to) => ({
      rate: from === to ? 1 : from === "INR" ? 0.012 : 83.333333,
      date: "2026-10-11",
      source: "UI test rate",
    }),
    geocoder: async (path) =>
      path.includes("autocomplete")
        ? {
            results: [
              {
                formatted: "Mumbai, India",
                name: "Mumbai",
                lat: 19.07,
                lon: 72.87,
                country: "India",
              },
            ],
          }
        : path.includes("places")
          ? {
              features: [
                {
                  properties: {
                    name: "Test Museum",
                    lat: 19.08,
                    lon: 72.88,
                    formatted: "Mumbai",
                  },
                },
              ],
            }
          : {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { distance: 1500, time: 1200 },
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [72.87, 19.07],
                      [72.88, 19.08],
                    ],
                  },
                },
              ],
            },
  }),
);
const server = app.listen(5481, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
export async function stop() {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
  await rm(path, { recursive: true, force: true });
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      await mongo.stop();
      await rm(path, { recursive: true, force: true });
      process.exit(0);
    }),
  );
