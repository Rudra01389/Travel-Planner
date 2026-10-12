import { createHash, createHmac, randomInt, randomBytes } from "node:crypto";
export const hashToken = (v) => createHash("sha256").update(v).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export const otp = () => String(randomInt(100000, 1000000));
export const hashCode = (key, code) =>
  createHmac("sha256", process.env.OTP_SECRET)
    .update(`${key}:${code}`)
    .digest("hex");
