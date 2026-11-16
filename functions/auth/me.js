export async function onRequestGet({ request, env }) {
  const cookieHeader = request.headers.get("Cookie") || "";

  const sessionCookie = cookieHeader
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith("m4na_session="));

  const sessionId = sessionCookie
    ? sessionCookie.substring("m4na_session=".length)
    : "";

  if (!sessionId) {
    return Response.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  if (
    !env.M4NA_SESSIONS ||
    !env.SUPABASE_URL ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return Response.json(
      { error: "M4NA authentication is not configured." },
      { status: 503 }
    );
  }

  try {
    const sessionData = await env.M4NA_SESSIONS.get(
      "session:" + sessionId
    );

    if (!sessionData) {
      return Response.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const session = JSON.parse(sessionData);
    const userId = session.user?.id;

    if (!userId) {
      throw new Error("Invalid session data.");
    }

    const supabaseUrl = env.SUPABASE_URL.replace(/\/+$/, "");

    // Recheck the member's current status in Supabase.
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/m4na_member_profiles` +
      `?user_id=eq.${encodeURIComponent(userId)}` +
      `&select=user_id,display_name,email,status`,
      {
        headers: {
          "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!profileResponse.ok) {
      console.error(
        "M4NA member status check failed:",
        await profileResponse.text()
      );

      return Response.json(
        { error: "Unable to verify member status." },
        { status: 503 }
      );
    }

    const profiles = await profileResponse.json();
    const profile = profiles[0];

    // Invalidate sessions for suspended, banned, or removed members.
    if (!profile || profile.status !== "active") {
      await env.M4NA_SESSIONS.delete(
        "session:" + sessionId
      );

      return Response.json(
        { authenticated: false },
        {
          status: 401,
          headers: {
            "Set-Cookie":
              "m4na_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    return Response.json(
      {
        authenticated: true,
        user: {
          id: profile.user_id,
          name: profile.display_name || "",
          email: profile.email || ""
        }
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("M4NA session lookup error:", error);

    return Response.json(
      { authenticated: false, error: "Session verification failed." },
      { status: 500 }
    );
  }
}
