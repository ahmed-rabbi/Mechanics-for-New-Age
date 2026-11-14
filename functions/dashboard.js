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
    return Response.redirect(new URL("/auth/login", request.url), 302);
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
      return Response.redirect(new URL("/auth/login", request.url), 302);
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

    const memberEmail = escapeHTML(
      user.email || "Not available"
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>M4NA | Member Dashboard</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f7f8f2;
  color: #26321b;
}

header {
  background: #26321b;
  color: white;
  padding: 24px 7%;
}

header h1 {
  margin: 0;
  font-size: 25px;
  letter-spacing: 1px;
}

header p {
  margin: 7px 0 0;
  color: #d5dfbd;
}

.container {
  max-width: 1100px;
  margin: 45px auto;
  padding: 0 22px;
}

.welcome {
  margin-bottom: 30px;
}

.welcome h2 {
  font-size: 30px;
  margin-bottom: 8px;
  color: #52652f;
}

.welcome p {
  color: #69745b;
  line-height: 1.6;
}

.profile {
  background: white;
  border: 1px solid #e5e9d9;
  border-left: 5px solid #8da653;
  border-radius: 10px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 4px 15px rgba(38,50,27,0.04);
}

.profile h3 {
  margin-top: 0;
  color: #52652f;
}

.profile p {
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.status {
  display: inline-block;
  background: #edf4df;
  color: #52652f;
  padding: 7px 13px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
}

.section-title {
  color: #52652f;
  margin-bottom: 18px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.card {
  background: white;
  border: 1px solid #e5e9d9;
  border-radius: 10px;
  padding: 25px;
  min-height: 170px;
  box-shadow: 0 4px 15px rgba(38,50,27,0.04);
}

.card h3 {
  color: #52652f;
  margin-top: 0;
}

.card p {
  color: #68715e;
  line-height: 1.6;
}

.card a {
  display: inline-block;
  margin-top: 10px;
  color: #637c35;
  font-weight: bold;
  text-decoration: none;
}

.card a:hover {
  text-decoration: underline;
}

.actions {
  margin-top: 35px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.button {
  display: inline-block;
  padding: 13px 22px;
  border-radius: 6px;
  background: #52652f;
  color: white;
  text-decoration: none;
  font-weight: bold;
}

.button.secondary {
  background: white;
  color: #52652f;
  border: 1px solid #9aab75;
}

footer {
  margin-top: 60px;
  padding: 25px;
  text-align: center;
  color: #758064;
  border-top: 1px solid #e3e8d8;
  font-size: 13px;
}

@media (max-width: 650px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .welcome h2 {
    font-size: 25px;
  }
}
</style>
</head>

<body>

<header>
  <h1>MECHANICS FOR NEW AGE</h1>
  <p>Member Dashboard</p>
</header>

<main class="container">

  <section class="welcome">
    <h2>Welcome, ${memberName}</h2>
    <p>
      Welcome to your M4NA member workspace.
      Explore research, laboratories and scientific resources.
    </p>
  </section>

  <section class="profile">
    <h3>My Profile</h3>

    <p><strong>Member:</strong> ${memberName}</p>
    <p><strong>Email:</strong> ${memberEmail}</p>

    <span class="status">● Account Session Active</span>
    <br><br>
<a href="https://mechanicsfornewage.com/my-account/edit-account/"
   style="color:#637c35; font-weight:bold; text-decoration:none;">
   Edit My Profile →
</a>
  </section>

  <h2 class="section-title">My Workspace</h2>

  <section class="grid">

    <div class="card">
      <h3>My Research</h3>
      <p>
        Explore M4NA research papers, publications
        and scientific developments.
      </p>
      <a href="/">Explore Research →</a>
    </div>

    <div class="card">
      <h3>Research Laboratories</h3>
      <p>
        Access the interactive laboratories and
        experimental research facilities.
      </p>
      <a href="/">Explore Laboratories →</a>
    </div>

    <div class="card">
      <h3>Member Resources</h3>
      <p>
        A dedicated space for M4NA learning
        materials and member resources.
      </p>
      <span class="status">Under Development</span>
    </div>

    <div class="card">
      <h3>Account Settings</h3>
      <p>
        Manage your central WordPress member
        account and password.
      </p>
      <a href="https://mechanicsfornewage.com/my-account/edit-account/">
        Change Password →
      </a>
    </div>

  </section>

  <div class="actions">
    <a class="button" href="/">Research Homepage</a>
    <a class="button secondary" href="/auth/logout">Sign Out</a>
  </div>

</main>

<footer>
  Mechanics for New Age (M4NA) Classical Mechanics
  <br><br>
  Redefining the Foundations of Mechanics &amp; Cosmology
</footer>

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
