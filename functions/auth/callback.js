```javascript
export async function onRequest(context) {
  const { request, env } = context;

  const wordpressUrl = "https://mechanicsfornewage.com";
  const redirectUri = "https://m4na-research.pages.dev/auth/callback";

  const clearStateCookie =
    "m4na_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=0";

  function errorResponse(message, status = 400) {
    return new Response(message, {
      status,
      headers: {
        "Set-Cookie": clearStateCookie,
        "Cache-Control": "no-store"
      }
    });
  }

  try {
    if (!env.MINIORANGE_CLIENT_ID ||
        !env.MINIORANGE_CLIENT_SECRET ||
        !env.M4NA_SESSIONS) {
      return errorResponse("Authentication is not configured.", 503);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    // Read the original state cookie.
    const cookies = request.headers.get("Cookie") || "";
    const stateCookie = cookies
      .split(";")
      .map(value => value.trim())
      .find(value => value.startsWith("m4na_oauth_state="));

    const savedState = stateCookie
      ? stateCookie.substring("m4na_oauth_state=".length)
      : "";

    // Compare state values without an early character-by-character exit.
    function secureCompare(a, b) {
      if (!a || !b || a.length !== b.length) return false;

      let difference = 0;

      for (let i = 0; i < a.length; i++) {
        difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }

      return difference === 0;
    }

    if (!secureCompare(savedState, returnedState)) {
      return errorResponse("Login verification failed. Please try again.");
    }

    if (!code) {
      return errorResponse("Authorization code was not received.");
    }

    // Exchange the authorization code for an access token.
    const tokenResponse = await fetch(
wordpressUrl + "/wp-json/moserver/token",      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          client_id: env.MINIORANGE_CLIENT_ID,
          client_secret: env.MINIORANGE_CLIENT_SECRET,
          redirect_uri: redirectUri
        })
      }
    );

    if (!tokenResponse.ok) {
      return errorResponse("WordPress token verification failed.", 502);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return errorResponse("WordPress did not provide an access token.", 502);
    }

    // Retrieve the authenticated WordPress member's profile.
    const profileResponse = await fetch(
wordpressUrl + "/wp-json/moserver/resource",      {
        headers: {
"Authorization": "Bearer " + tokenData.access_token,          "Accept": "application/json"
        }
      }
    );

    if (!profileResponse.ok) {
      return errorResponse("Could not retrieve the member profile.", 502);
    }

    const profile = await profileResponse.json();

    if (!profile || !profile.id) {
      return errorResponse("The WordPress member profile is incomplete.", 502);
    }

    // Generate a separate random session identifier.
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);

    const sessionId = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    // Store the member profile in Cloudflare KV.
    // The WordPress access token is not stored in the browser.
    await env.M4NA_SESSIONS.put(
"session:" + sessionId,
JSON.stringify({
        user: profile,
        createdAt: Date.now()
      }),
      { expirationTtl: 604800 }
    );

       // Establish the secure browser session.
    const responseHeaders = new Headers({
      "Location": new URL("/", request.url).toString(),
      "Set-Cookie":
"m4na_session=" + sessionId + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800",      "Cache-Control": "no-store"
    });

    responseHeaders.append("Set-Cookie", clearStateCookie);

    return new Response(null, {
      status: 302,
      headers: responseHeaders
    });

  } catch (error) {
    return errorResponse("An authentication error occurred.", 500);
  }
}
```
