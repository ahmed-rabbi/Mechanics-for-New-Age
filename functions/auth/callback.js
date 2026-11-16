export async function onRequest(context) {
  const { request, env } = context;

  const wordpressUrl = "https://mechanicsfornewage.com";
  const redirectUri = "https://m4na-research.pages.dev/auth/callback";

  const clearStateCookie =
    "m4na_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=0";

  function errorResponse(message, status = 400) {
    return new Response(message, {
      status: status,
      headers: {
        "Set-Cookie": clearStateCookie,
        "Cache-Control": "no-store"
      }
    });
  }

 const missingSettings = [];

if (!env.MINIORANGE_CLIENT_ID) missingSettings.push("MINIORANGE_CLIENT_ID");
if (!env.MINIORANGE_CLIENT_SECRET) missingSettings.push("MINIORANGE_CLIENT_SECRET");
if (!env.M4NA_SESSIONS) missingSettings.push("M4NA_SESSIONS");
if (!env.SUPABASE_URL) missingSettings.push("SUPABASE_URL");
if (!env.SUPABASE_SERVICE_ROLE_KEY) missingSettings.push("SUPABASE_SERVICE_ROLE_KEY");

if (missingSettings.length > 0) {
  console.error("M4NA missing configuration:", missingSettings);

  return errorResponse(
    "M4NA configuration is missing: " + missingSettings.join(", "),
    503
  );
}

    const url = new URL(request.url);

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    const cookies = request.headers.get("Cookie") || "";

    const stateCookie = cookies
      .split(";")
      .map(value => value.trim())
      .find(value => value.startsWith("m4na_oauth_state="));

    const savedState = stateCookie
      ? stateCookie.substring("m4na_oauth_state=".length)
      : "";

    function secureCompare(a, b) {
      if (!a || !b || a.length !== b.length) {
        return false;
      }

      let difference = 0;

      for (let i = 0; i < a.length; i++) {
        difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }

      return difference === 0;
    }

    if (!secureCompare(savedState, returnedState)) {
      return errorResponse(
        "Login verification failed. Please try again."
      );
    }

    if (!code) {
      return errorResponse(
        "Authorization code was not received."
      );
    }

    // -----------------------------------------
    // 1. EXCHANGE WORDPRESS AUTHORIZATION CODE
    // -----------------------------------------

    const tokenResponse = await fetch(
      wordpressUrl + "/wp-json/moserver/token",
      {
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
      return errorResponse(
        "WordPress token verification failed.",
        502
      );
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return errorResponse(
        "WordPress did not provide an access token.",
        502
      );
    }

    // -----------------------------------------
    // 2. RETRIEVE AUTHENTICATED WORDPRESS USER
    // -----------------------------------------

    const profileResponse = await fetch(
      wordpressUrl + "/wp-json/moserver/resource",
      {
        headers: {
          "Authorization": "Bearer " + tokenData.access_token,
          "Accept": "application/json"
        }
      }
    );

    if (!profileResponse.ok) {
      return errorResponse(
        "Could not retrieve the WordPress member profile.",
        502
      );
    }

    const wordpressProfile = await profileResponse.json();

    const wordpressUserId = Number(
      wordpressProfile && wordpressProfile.id
    );

    if (
      !wordpressProfile ||
      !Number.isSafeInteger(wordpressUserId) ||
      wordpressUserId <= 0
    ) {
      return errorResponse(
        "The WordPress member profile is incomplete.",
        502
      );
    }

    // -----------------------------------------
    // 3. FIND THE CENTRAL M4NA MEMBER PROFILE
    // -----------------------------------------

    const supabaseUrl = env.SUPABASE_URL.replace(/\/+$/, "");

    const profileUrl =
      supabaseUrl +
      "/rest/v1/m4na_member_profiles" +
      "?wordpress_user_id=eq." +
      encodeURIComponent(String(wordpressUserId)) +
      "&select=user_id,wordpress_user_id,display_name,email,status";

    const centralProfileResponse = await fetch(
      profileUrl,
      {
        headers: {
          "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization":
            "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!centralProfileResponse.ok) {
      console.error(
        "M4NA central profile lookup failed:",
        centralProfileResponse.status,
        await centralProfileResponse.text()
      );

      return errorResponse(
        "Unable to verify your central M4NA account.",
        503
      );
    }

    const profiles = await centralProfileResponse.json();

    if (!Array.isArray(profiles) || profiles.length !== 1) {
      return errorResponse(
        "Your WordPress account is not linked to a central M4NA identity. Please contact the administrator.",
        403
      );
    }

    const member = profiles[0];

    // -----------------------------------------
    // 4. VERIFY CENTRAL SUPABASE IDENTITY
    // -----------------------------------------

    if (
      !member.user_id ||
      member.wordpress_user_id !== wordpressUserId
    ) {
      return errorResponse(
        "Your central M4NA identity is incomplete.",
        403
      );
    }

    // -----------------------------------------
    // 5. ENFORCE CENTRAL MEMBERSHIP STATUS
    // -----------------------------------------

    if (member.status !== "active") {
      return errorResponse(
        "Your M4NA membership is not currently active. Please contact the administrator.",
        403
      );
    }

    if (!member.display_name) {
      return errorResponse(
        "Your M4NA member profile requires a display name.",
        403
      );
    }

    // -----------------------------------------
    // 6. CREATE CENTRAL M4NA SESSION
    // -----------------------------------------

    const randomBytes = new Uint8Array(32);

    crypto.getRandomValues(randomBytes);

    const sessionId = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    const centralUser = {
      id: member.user_id,
      wordpress_user_id: wordpressUserId,
      name: member.display_name,
      email: member.email || ""
    };

    await env.M4NA_SESSIONS.put(
      "session:" + sessionId,
      JSON.stringify({
        user: centralUser,
        createdAt: Date.now()
      }),
      {
        expirationTtl: 604800
      }
    );

    // -----------------------------------------
    // 7. COMPLETE LOGIN
    // -----------------------------------------

    const responseHeaders = new Headers({
      "Location": new URL("/dashboard", request.url).toString(),
      "Set-Cookie":
        "m4na_session=" + sessionId +
        "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800",
      "Cache-Control": "no-store"
    });

    responseHeaders.append(
      "Set-Cookie",
      clearStateCookie
    );

    return new Response(null, {
      status: 302,
      headers: responseHeaders
    });

  } catch (error) {
    console.error(
      "M4NA OAuth callback error:",
      error.message
    );

    return errorResponse(
      "An authentication error occurred.",
      500
    );
  }
}
