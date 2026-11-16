export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed." },
      { status: 405 }
    );
  }

  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.M4NA_SESSIONS
  ) {
    return Response.json(
      { error: "M4NA authentication is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const accessToken = body.access_token;

    if (
      typeof accessToken !== "string" ||
      accessToken.length < 20
    ) {
      return Response.json(
        { error: "A valid verification session is required." },
        { status: 400 }
      );
    }

    const supabaseUrl = env.SUPABASE_URL.replace(/\/+$/, "");

    // Validate the access token with Supabase.
    const authResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          "apikey": env.SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    if (!authResponse.ok) {
      return Response.json(
        { error: "Email verification could not be confirmed." },
        { status: 401 }
      );
    }

    const authUser = await authResponse.json();

    if (!authUser.email_confirmed_at) {
      return Response.json(
        { error: "Please verify your email address first." },
        { status: 403 }
      );
    }

    const userId = authUser.id;
    const email = (authUser.email || "").toLowerCase();

    const displayName =
      authUser.user_metadata?.display_name?.trim() || "";

    if (!displayName) {
      return Response.json(
        { error: "Your M4NA display name is missing. Please contact the administrator." },
        { status: 400 }
      );
    }

    // Retrieve the central M4NA member profile.
    const profileUrl =
      `${supabaseUrl}/rest/v1/m4na_member_profiles` +
      `?user_id=eq.${encodeURIComponent(userId)}` +
      `&select=user_id,display_name,email,status`;

    const profileResponse = await fetch(profileUrl, {
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!profileResponse.ok) {
      console.error(
        "M4NA profile lookup failed:",
        await profileResponse.text()
      );

      return Response.json(
        { error: "Your member profile could not be checked." },
        { status: 500 }
      );
    }

    const profiles = await profileResponse.json();
    let profile = profiles[0];

    // Create a profile if registration did not create one.
    if (!profile) {
      const createResponse = await fetch(
        `${supabaseUrl}/rest/v1/m4na_member_profiles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify({
            user_id: userId,
            display_name: displayName,
            email: email,
            status: "active"
          })
        }
      );

      if (!createResponse.ok) {
        console.error(
          "M4NA profile creation failed:",
          await createResponse.text()
        );

        return Response.json(
          { error: "Your member profile could not be created." },
          { status: 500 }
        );
      }

      const createdProfiles = await createResponse.json();
      profile = createdProfiles[0];
    }

    // Check the member's moderation status.
    if (!profile || profile.status !== "active") {
      return Response.json(
        {
          error: "Your M4NA account is currently suspended or banned. Please contact the administrator."
        },
        { status: 403 }
      );
    }

    // Generate a secure random session identifier.
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);

    const sessionId = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    const sessionUser = {
      id: userId,
      name: profile.display_name || displayName,
      email: profile.email || email
    };

    // Store the session for seven days.
    await env.M4NA_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify({
        user: sessionUser,
        createdAt: new Date().toISOString()
      }),
      { expirationTtl: 604800 }
    );

    return Response.json(
      {
        success: true,
        message: "M4NA email verification completed."
      },
      {
        status: 200,
        headers: {
          "Set-Cookie":
            `m4na_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("M4NA session completion error:", error);

    return Response.json(
      { error: "An unexpected authentication error occurred." },
      { status: 500 }
    );
  }
}
