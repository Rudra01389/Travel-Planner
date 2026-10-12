import mongoose from "mongoose";
const { Schema, model } = mongoose;
export const User = model(
  "User",
  new Schema(
    {
      email: { type: String, unique: true, required: true },
      name: String,
      passwordHash: String,
      googleSub: String,
      preferences: { type: [String], default: [] },
      currency: { type: String, default: "INR" },
      timeZone: { type: String, default: "UTC" },
      sessionVersion: { type: Number, default: 0 },
    },
    { timestamps: true, collection: "wayfare_users" },
  ),
);
export const Challenge = model(
  "Challenge",
  new Schema(
    {
      key: { type: String, unique: true },
      email: String,
      purpose: String,
      codeHash: String,
      name: String,
      passwordHash: String,
      attempts: { type: Number, default: 0 },
      sentAt: Date,
      expiresAt: { type: Date, expires: 0 },
    },
    { collection: "wayfare_otp_challenges" },
  ),
);
export const Session = model(
  "Session",
  new Schema(
    {
      tokenHash: { type: String, unique: true },
      userId: { type: Schema.Types.ObjectId, index: true },
      version: Number,
      expiresAt: { type: Date, expires: 0 },
    },
    { collection: "wayfare_sessions" },
  ),
);
export const Trip = model(
  "Trip",
  new Schema(
    {
      owner: { type: Schema.Types.ObjectId, index: true },
      id: { type: String, unique: true },
      members: { type: [Schema.Types.ObjectId], default: [] },
      invitations: { type: [String], default: [] },
      revision: { type: Number, default: 0 },
      data: Schema.Types.Mixed,
    },
    { timestamps: true, collection: "wayfare_trips" },
  ),
);
export const Document = model(
  "Document",
  new Schema(
    {
      owner: Schema.Types.ObjectId,
      tripId: { type: String, index: true },
      id: { type: String, unique: true },
      name: String,
      mime: String,
      bytes: Buffer,
    },
    { timestamps: true, collection: "wayfare_documents" },
  ),
);
