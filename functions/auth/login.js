export async function onRequest(context) {
  const { request, env } = context;

  const wordpressUrl = "https://mechanicsfornewage.com";
  const clientId = env.MINIORANGE_CLIENT_ID;
  const redirectUri = "https://m4na-research.pages.dev/auth/callback";

  if (!clientId) {
    return new Response(
      "Login is not configured yet. Please contact the administrator.",
      { status: 503 }
    );
  }

  // Generate a secure random state value.
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  const state = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");

  // Build the WordPress authorization URL.
  const authorizationUrl = new URL(
    "/wp-json/moserver/authorize",
    wordpressUrl
  );

  authorizationUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "profile",
    state: state
  }).toString();

  // Save state securely for callback verification.
  return new Response(null, {
    status: 302,
    headers: {
      "Location": authorizationUrl.toString(),
      "Set-Cookie":
        `m4na_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=600`,
      "Cache-Control": "no-store"
    }
  });
}
