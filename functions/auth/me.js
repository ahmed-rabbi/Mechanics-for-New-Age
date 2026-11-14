export async function onRequest(context) {
  const { request, env } = context;

  const cookies = request.headers.get("Cookie") || "";

  const sessionCookie = cookies
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

    return Response.json({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.display_name || session.user.name || "",
        email: session.user.email || ""
      }
    });

  } catch (error) {
    console.error("M4NA session lookup error:", error.message);

    return Response.json(
      { authenticated: false, error: "Session verification failed" },
      { status: 500 }
    );
  }
}
