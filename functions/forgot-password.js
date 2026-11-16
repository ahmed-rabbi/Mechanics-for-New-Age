export async function onRequestGet() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Forgot Password | M4NA</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f5f7f0;
  color: #26321b;
  font-family: Arial, sans-serif;
}
.card {
  width: 100%;
  max-width: 430px;
  padding: 38px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 8px 30px rgba(38,50,27,.08);
}
.brand { text-align: center; font-size: 25px; font-weight: bold; }
.subtitle { text-align: center; color: #68745d; margin: 8px 0 28px; }
h2 { text-align: center; font-size: 22px; }
p { color: #68745d; line-height: 1.6; text-align: center; }
label { display: block; margin: 22px 0 8px; font-weight: bold; }
input {
  width: 100%;
  padding: 13px;
  border: 1px solid #d9dfd0;
  border-radius: 8px;
  font-size: 15px;
}
button {
  width: 100%;
  margin-top: 22px;
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: #526b32;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
button:disabled { opacity: .6; cursor: wait; }
#message { margin-top: 18px; font-size: 14px; }
a {
  display: block;
  text-align: center;
  margin-top: 22px;
  color: #526b32;
  text-decoration: none;
  font-weight: bold;
}
</style>
</head>
<body>
<div class="card">
  <div class="brand">M4NA</div>
  <div class="subtitle">Mechanics for New Age</div>
  <h2>Forgot Your Password?</h2>
  <p>Enter your registered email address. We will send you instructions to reset your M4NA password.</p>

  <form id="forgotForm">
    <label for="email">Email Address</label>
    <input
      type="email"
      id="email"
      autocomplete="email"
      placeholder="Enter your registered email"
      required
    >
    <button type="submit" id="submitButton">
      Send Reset Link
    </button>
  </form>
  <div id="message" role="status"></div>
  <a href="/login">Return to Sign In</a>
</div>

<script>
const form = document.getElementById("forgotForm");
const button = document.getElementById("submitButton");
const message = document.getElementById("message");

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  button.disabled = true;
  button.textContent = "Sending...";
  message.textContent = "";

  const email = document.getElementById("email").value.trim();
  try {
    const response = await fetch("/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to process your request.");
    }

    message.textContent =
      "If an account exists for this email, a password-reset link will be sent. Please check your inbox and spam folder.";
    form.reset();

  } catch (error) {
    message.textContent = error.message;
  }

  button.disabled = false;
  button.textContent = "Send Reset Link";
});
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}
