import { OAuth2Client } from "google-auth-library";
export function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirect:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.CLIENT_ORIGIN}/api/auth/google/callback`,
  };
}
export async function googleIdentity(code, nonce) {
  const c = googleConfig(),
    client = new OAuth2Client(c.clientId, c.clientSecret, c.redirect);
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: c.clientId,
  });
  const p = ticket.getPayload();
  if (!p?.email_verified || p.nonce !== nonce)
    throw Error("Invalid Google identity");
  return p;
}
export async function geo(path, params, fetcher = fetch) {
  if (!process.env.GEOAPIFY_API_KEY)
    throw Object.assign(
      Error(
        "Destination search and routes need GEOAPIFY_API_KEY in the server .env.",
      ),
      { status: 503 },
    );
  const url = new URL(`https://api.geoapify.com/${path}`);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, String(value));
  url.searchParams.set("apiKey", process.env.GEOAPIFY_API_KEY);
  try {
    const r = await fetcher(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw Error("Provider unavailable");
    return await r.json();
  } catch {
    throw Object.assign(
      Error("The map service is unavailable. Please try again."),
      { status: 503 },
    );
  }
}
export function place(p) {
  return {
    name: (p.name || p.formatted || "Place").slice(0, 200),
    lat: p.lat,
    lon: p.lon,
    country: p.country || "",
    address: (p.formatted || p.address_line2 || "").slice(0, 300),
    categories: p.categories || [],
  };
}
