export async function onRequestGet() {

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>M4NA Email Confirmation</title>

<style>
body {
  margin: 0;
  padding: 30px 16px;
  font-family: Arial, sans-serif;
  background: #f5f7ef;
  color: #26321b;
}

.panel {
  max-width: 440px;
  margin: 70px auto;
  padding: 32px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 5px 25px rgba(0,0,0,0.07);
}

h2 {
  margin-top: 0;
  color: #26321b;
}

input, button {
  box-sizing: border-box;
  width: 100%;
  padding: 13px;
  margin-top: 14px;
  border-radius: 7px;
  font-size: 15px;
}

input {
  border: 1px solid #ccd5bd;
}

button {
  border: 0;
  background: #b2cb70;
  color: #26321b;
  font-weight: bold;
  cursor: pointer;
}

#message {
  margin-top: 20px;
  line-height: 1.6;
}
</style>
</head>

<body>

<div class="panel">

<h2>M4NA Email Confirmation</h2>

<p>Request a new confirmation email for your existing M4NA account.</p>

<form id="resendForm">

<input
  type="email"
  id="email"
  value="ahmedrabbi989900@gmail.com"
  required
>

<button type="submit" id="submitButton">
Send Confirmation Email
</button>

</form>

<div id="message" role="status"></div>

</div>

<script>
document.getElementById("resendForm")
.addEventListener("submit", async function(event) {

  event.preventDefault();

  const button = document.getElementById("submitButton");
  const message = document.getElementById("message");

  button.disabled = true;
  button.textContent = "Sending...";
  message.textContent = "";

  try {

    const response = await fetch("/auth/resend-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: document.getElementById("email").value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Email request failed.");
    }

    message.textContent =
      "Request submitted. Please check your email inbox and spam folder.";

  } catch (error) {

    message.textContent = error.message;

  } finally {

    button.disabled = false;
    button.textContent = "Send Confirmation Email";

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
