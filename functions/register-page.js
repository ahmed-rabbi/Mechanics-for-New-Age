export async function onRequest(context) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>M4NA Member Registration</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  padding: 30px 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f8f1;
  font-family: Arial, sans-serif;
  color: #26321b;
}

.container {
  width: 100%;
  max-width: 460px;
  background: #ffffff;
  padding: 38px 32px;
  border: 1px solid #e4ead8;
  border-radius: 15px;
  box-shadow: 0 10px 35px rgba(38,50,27,.07);
}

.brand {
  text-align: center;
  color: #78963d;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 1.5px;
}

h1 {
  text-align: center;
  font-size: 27px;
  margin: 15px 0 8px;
}

.subtitle {
  text-align: center;
  color: #697260;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 28px;
}

label {
  display: block;
  font-size: 13px;
  font-weight: bold;
  margin: 17px 0 7px;
}

input {
  width: 100%;
  padding: 13px 14px;
  border: 1px solid #dce3d2;
  border-radius: 7px;
  font-size: 15px;
  outline: none;
}

input:focus {
  border-color: #91ad58;
  box-shadow: 0 0 0 3px rgba(178,203,112,.18);
}

button {
  width: 100%;
  padding: 14px;
  margin-top: 22px;
  border: none;
  border-radius: 7px;
  background: #78963d;
  color: white;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}

button:hover {
  background: #627d31;
}

button:disabled {
  opacity: .6;
  cursor: wait;
}

.message {
  display: none;
  margin-top: 17px;
  padding: 12px;
  border-radius: 7px;
  font-size: 13px;
  line-height: 1.6;
}

.success {
  display: block;
  background: #eef6e5;
  color: #38551e;
}

.error {
  display: block;
  background: #fff0ed;
  color: #a23c2d;
}

.divider {
  height: 1px;
  background: #e8ecdf;
  margin: 28px 0;
}

.login {
  text-align: center;
  font-size: 13px;
  color: #697260;
  margin-top: 23px;
}

.login a {
  color: #6e8b37;
  font-weight: bold;
  text-decoration: none;
}

#codeSection {
  display: none;
}

.note {
  font-size: 12px;
  color: #77806c;
  line-height: 1.6;
  margin-top: 12px;
}
</style>
</head>

<body>

<main class="container">

  <div class="brand">MECHANICS FOR NEW AGE</div>

  <h1>Join M4NA</h1>

  <p class="subtitle">
    Create your M4NA member account and become part
    of our scientific research community.
  </p>

  <form id="registerForm">

    <label for="displayName">Display Name *</label>
    <input
      id="displayName"
      type="text"
      maxlength="100"
      placeholder="Enter your display name"
      autocomplete="name"
      required
    >

    <label for="email">Email Address *</label>
    <input
      id="email"
      type="email"
      placeholder="Enter your email address"
      autocomplete="email"
      required
    >

    <label for="password">Password *</label>
    <input
      id="password"
      type="password"
      minlength="8"
      placeholder="At least 8 characters"
      autocomplete="new-password"
      required
    >

    <label for="confirmPassword">Confirm Password *</label>
    <input
      id="confirmPassword"
      type="password"
      minlength="8"
      placeholder="Enter your password again"
      autocomplete="new-password"
      required
    >

    <button id="registerButton" type="submit">
      Create My Account
    </button>

  </form>

  <div id="registerMessage" class="message"></div>

  <section id="codeSection">

    <div class="divider"></div>

    <h2 style="text-align:center;font-size:20px;">
      Verify Your Email
    </h2>

    <p class="subtitle">
      Enter the verification code sent to your email address.
    </p>

    <form id="codeForm">

      <label for="verificationCode">Verification Code</label>

      <input
        id="verificationCode"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        placeholder="Enter your email code"
        maxlength="12"
        required
      >

      <button id="verifyButton" type="submit">
        Verify Email & Continue
      </button>

    </form>

    <div id="codeMessage" class="message"></div>

    <p class="note">
      You can also verify your email by clicking the
      confirmation link sent to your inbox.
    </p>

  </section>

  <div class="login">
    Already a member?
    <a href="/login">Sign in</a>
  </div>

</main>

<script>
const registerForm = document.getElementById("registerForm");
const codeForm = document.getElementById("codeForm");
const registerMessage = document.getElementById("registerMessage");
const codeMessage = document.getElementById("codeMessage");
const codeSection = document.getElementById("codeSection");

let registeredEmail = "";

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = "message " + type;
}

registerForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const displayName =
    document.getElementById("displayName").value.trim();

  const email =
    document.getElementById("email").value.trim().toLowerCase();

  const password =
    document.getElementById("password").value;

  const confirmPassword =
    document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    showMessage(
      registerMessage,
      "The passwords do not match.",
      "error"
    );
    return;
  }

  const button = document.getElementById("registerButton");
  button.disabled = true;
  button.textContent = "Creating Account...";

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        display_name: displayName,
        email: email,
        password: password
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Registration could not be completed."
      );
    }

    registeredEmail = email;

    showMessage(
      registerMessage,
      result.message,
      "success"
    );

    codeSection.style.display = "block";

    document.getElementById("email").readOnly = true;

  } catch (error) {
    showMessage(registerMessage, error.message, "error");

  } finally {
    button.disabled = false;
    button.textContent = "Create My Account";
  }
});

codeForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const token =
    document.getElementById("verificationCode").value.trim();

  const button = document.getElementById("verifyButton");

  button.disabled = true;
  button.textContent = "Verifying...";

  try {
    const response = await fetch("/auth/verify-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: registeredEmail,
        token: token
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Email verification failed."
      );
    }

    const completion = await fetch("/auth/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        access_token: result.access_token
      })
    });

    const completionResult = await completion.json();

    if (!completion.ok || !completionResult.success) {
      throw new Error(
        completionResult.error ||
        "Your account could not be activated."
      );
    }

    showMessage(
      codeMessage,
      "Your email is verified. Welcome to M4NA!",
      "success"
    );

    setTimeout(function() {
      window.location.href = "/dashboard";
    }, 1500);

  } catch (error) {
    showMessage(codeMessage, error.message, "error");

  } finally {
    button.disabled = false;
    button.textContent = "Verify Email & Continue";
  }
});
</script>

</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}
