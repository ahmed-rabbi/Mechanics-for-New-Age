export async function onRequest({ request, env }) {
  const cookies = request.headers.get("Cookie") || "";

  const sessionCookie = cookies
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith("m4na_session="));

  const sessionId = sessionCookie
    ? sessionCookie.substring("m4na_session=".length)
    : "";

  try {
    if (
      sessionId &&
      /^[a-f0-9]{64}$/.test(sessionId) &&
      env.M4NA_SESSIONS
    ) {
      await env.M4NA_SESSIONS.delete("session:" + sessionId);
    }
  } catch (error) {
    console.error("M4NA logout error:", error);
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Location": new URL("/login", request.url).toString(),
      "Set-Cookie": "m4na_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      "Cache-Control": "no-store"
    }
  });
}
