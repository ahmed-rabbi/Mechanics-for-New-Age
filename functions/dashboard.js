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

  if (!sessionId || !/^[a-f0-9]{64}$/.test(sessionId)) {
    return Response.redirect(
      new URL("/auth/login", request.url),
      302
    );
  }

  if (!env.M4NA_SESSIONS) {
    return new Response("Session storage is unavailable.", {
      status: 503
    });
  }

  try {
    const sessionData = await env.M4NA_SESSIONS.get(
      "session:" + sessionId
    );

    if (!sessionData) {
      return Response.redirect(
        new URL("/auth/login", request.url),
        302
      );
    }

    const session = JSON.parse(sessionData);
    const user = session.user || {};

    function escapeHTML(value) {
      return String(value || "").replace(/[&<>"']/g, function (char) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[char];
      });
    }

    const memberName = escapeHTML(
      user.display_name || user.name || "M4NA Member"
    );

    const memberEmail = escapeHTML(user.email || "Not available");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>M4NA Member Dashboard</title>
<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f5f7ef;
  color: #26321b;
}
header {
  background: #26321b;
  color: white;
  padding: 22px;
  text-align: center;
}
main {
  max-width: 850px;
  margin: 45px auto;
  padding: 25px;
}
.card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 3px 15px rgba(0,0,0,0.08);
}
h1, h2 {
  color: #52652f;
}
.button {
  display: inline-block;
  margin-top: 20px;
  padding: 12px 22px;
  background: #52652f;
  color: white;
  text-decoration: none;
  border-radius: 6px;
}
</style>
</head>
<body>
<header>
  <h1>Mechanics for New Age</h1>
  <p>Member Dashboard</p>
</header>
<main>
  <section class="card">
    <h2>Welcome, ${memberName}</h2>
    <p><strong>Account:</strong> ${memberName}</p>
    <p><strong>Email:</strong> ${memberEmail}</p>
    <p>Your M4NA member session is active.</p>
    <a class="button" href="/">Return to Research Home</a>
    <a class="button" href="/auth/logout">Sign Out</a>
  </section>
</main>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    console.error("M4NA dashboard error:", error.message);

    return new Response("Unable to load the member dashboard.", {
      status: 500,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }
}
