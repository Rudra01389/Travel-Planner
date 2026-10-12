export function readConfig(env = process.env) {
  const required = [
    "MONGODB_URI",
    "OTP_SECRET",
    "CLIENT_ORIGIN",
    "BREVO_SENDER_EMAIL",
  ];
  for (const key of required) {
    if (!env[key]?.trim())
      throw new Error(`Missing ${key}. Set it in the project-root .env file.`);
  }
  if (env.OTP_SECRET.length < 32)
    throw new Error("OTP_SECRET must contain at least 32 random characters.");
  if (
    !env.BREVO_API_KEY?.trim() &&
    !(env.BREVO_SMTP_USER?.trim() && env.BREVO_SMTP_KEY?.trim())
  ) {
    throw new Error(
      "Set BREVO_API_KEY, or both BREVO_SMTP_USER and BREVO_SMTP_KEY, in .env.",
    );
  }
  const rawPort = env.PORT || "5000";
  if (
    !/^\d+$/.test(rawPort) ||
    Number(rawPort) < 1 ||
    Number(rawPort) > 65535
  ) {
    throw new Error(
      "PORT must be a number between 1 and 65535 (for example, PORT=5000).",
    );
  }
  let origin;
  try {
    origin = new URL(env.CLIENT_ORIGIN);
  } catch {
    throw new Error(
      "CLIENT_ORIGIN must be a complete origin, such as http://localhost:5173.",
    );
  }
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/"
  ) {
    throw new Error(
      "CLIENT_ORIGIN must contain only the protocol, hostname, and optional port.",
    );
  }
  if (!/^mongodb(\+srv)?:\/\//.test(env.MONGODB_URI))
    throw new Error(
      "MONGODB_URI must start with mongodb:// or mongodb+srv://.",
    );
  const params = new URLSearchParams(env.MONGODB_URI.split("?")[1] || "");
  for (const key of ["tls", "ssl"]) {
    if (params.has(key) && !["true", "false"].includes(params.get(key))) {
      throw new Error(
        `MONGODB_URI has an invalid ${key} option. Use ${key}=true or ${key}=false.`,
      );
    }
  }
  return {
    port: Number(rawPort),
    origin: origin.origin,
    mongoUri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME?.trim() || undefined,
  };
}
export function startupMessage(error) {
  if (error.code === "EADDRINUSE")
    return "The API port is already in use. Stop the other Wayfare server or choose a different PORT in .env.";
  if (error.code === 18 || error.codeName === "AuthenticationFailed")
    return "MongoDB authentication failed. Check the database username and password in .env.";
  if ([85, 86].includes(error.code))
    return "MongoDB has an incompatible index definition. Existing data and indexes have been preserved. Inspect the conflicting index settings before changing them.";
  if (error.name === "MongooseServerSelectionError")
    return "MongoDB could not be reached. Check the connection string, network connection, and Atlas network access settings.";
  return (error.message || "Unable to start the server.").replace(
    /mongodb(?:\+srv)?:\/\/\S+/g,
    "[MongoDB connection string hidden]",
  );
}
