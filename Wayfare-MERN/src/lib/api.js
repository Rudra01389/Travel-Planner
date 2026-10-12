export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "include",
      signal: AbortSignal.timeout(30000),
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      "Cannot reach the server. Check your connection and make sure the backend is running.",
    );
  }
  const data = await response
    .json()
    .catch(() => ({ message: "Server is unavailable. Please try again." }));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.fields = data.fields;
    throw error;
  }
  return data;
}
