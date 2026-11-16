export async function onRequestGet() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>M4NA Central Login</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f5f7f0;
  font-family: Arial, sans-serif;
  color: #26321b;
}

.login-box {
  width: 100%;
  max-width: 430px;
  background: #ffffff;
  padding: 38px;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(38, 50, 27, 0.08);
}

.logo {
  text-align: center;
  font-size: 27px;
  font-weight: 700;
  color: #26321b;
  margin-bottom: 8px;
}

.subtitle {
  text-align: center;
  color: #68745d;
  font-size: 14px;
  margin-bottom: 30px;
}

h2 {
  text-align: center;
  font-size: 21px;
  margin-bottom: 25px;
}

label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin: 17px 0 7px;
}

input {
  width: 100%;
  padding: 13px;
  border: 1px solid #d9dfd0;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}

input:focus {
  border-color: #8ca64e;
  box-shadow: 0 0 0 3px rgba(178, 203, 112, 0.2);
}

button {
  width: 100%;
  margin-top: 25px;
  padding: 14px;
  border: none;
  border-radius: 8px;
  background: #526b32;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  background: #405526;
}

button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.message {
  display: none;
  margin-top: 17px;
  padding: 12px;
  border-radius: 7px;
  font-size: 14px;
  line-height: 1.5;
}

.error {
  display: block;
  background: #fff0ef;
  color: #a32c24;
}

.links {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  line-height: 2;
}

.links a {
  color: #526b32;
  text-decoration: none;
  font-weight: 600;
}

</style>
</head>

<body>

<div class="login-box">

  <div class="logo">M4NA</div>

  <div class="subtitle">
    Mechanics for New Age
  </div>

  <h2>Sign in to your account</h2>

  <form id="loginForm">

    <label for="email">Email address</label>
    <input
      type="email"
      id="email"
      autocomplete="email"
      required
    >

    <label for="password">Password</label>
    <input
      type="password"
      id="password"
      autocomplete="current-password"
      required
    >

    <button type="submit" id="loginButton">
      Sign In
    </button>

    <div id="message" class="message"></div>

  </form>

  <div class="links">
    <div>New to M4NA? <a href="/register-page">Create an account</a></div>
    <div><a href="/">Return to M4NA</a></div>
  </div>

</div>

<script>
const form = document.getElementById("loginForm");
const button = document.getElementById("loginButton");
const message = document.getElementById("message");

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  message.className = "message";
  message.textContent = "";

  button.disabled = true;
  button.textContent = "Signing in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const loginResponse = await fetch("/auth/password-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok || !loginData.access_token) {
      throw new Error(
        loginData.error || "Unable to sign in. Please check your details."
      );
    }

    const sessionResponse = await fetch("/auth/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        access_token: loginData.access_token
      })
    });

    const sessionData = await sessionResponse.json();

    if (!sessionResponse.ok || !sessionData.success) {
      throw new Error(
        sessionData.error || "Your M4NA session could not be created."
      );
    }

    window.location.href = "/dashboard";

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";

    button.disabled = false;
    button.textContent = "Sign In";
  }
});
</script>

</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}
