export async function onRequestGet({ env }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reset Password | M4NA</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0; font-family: Arial, sans-serif;
  background: #f5f7f0; color: #26321b;
  min-height: 100vh; display: flex;
  align-items: center; justify-content: center; padding: 20px;
}
.card {
  width: 100%; max-width: 440px; background: #fff;
  padding: 38px; border-radius: 14px;
  box-shadow: 0 8px 30px rgba(38,50,27,.08);
}
.brand {
  text-align: center; font-size: 14px;
  letter-spacing: 2px; color: #71834b; font-weight: bold;
}
h1 { text-align: center; font-size: 25px; margin: 14px 0; }
p { text-align: center; color: #66705d; line-height: 1.6; }
label { display: block; margin: 18px 0 7px; font-weight: bold; }
input {
  width: 100%; padding: 13px; border: 1px solid #d8dfce;
  border-radius: 7px; font-size: 15px;
}
button {
  width: 100%; margin-top: 22px; padding: 14px;
  border: 0; border-radius: 7px; background: #b2cb70;
  color: #26321b; font-size: 16px; font-weight: bold; cursor: pointer;
}
button:disabled { opacity: .6; cursor: wait; }
#message { margin-top: 18px; font-size: 14px; text-align: center; }
.back { display: block; text-align: center; margin-top: 22px; color: #536b32; }
</style>
</head>
<body>
<div class="card">
  <div class="brand">MECHANICS FOR NEW AGE</div>
  <h1>Reset Your Password</h1>
  <p>Enter a new password for your M4NA account.</p>

  <form id="resetForm" style="display:none">
    <label for="password">New Password</label>
    <input id="password" type="password" autocomplete="new-password"
      minlength="8" placeholder="At least 8 characters" required>

    <label for="confirmPassword">Confirm New Password</label>
    <input id="confirmPassword" type="password" autocomplete="new-password"
      minlength="8" placeholder="Enter your password again" required>

    <button id="submitButton" type="submit">Update Password</button>
  </form>

  <div id="message" role="status">Checking your recovery link...</div>
  <a class="back" href="/login">Return to Sign In</a>
</div>

<script>
const form = document.getElementById("resetForm");
const message = document.getElementById("message");
const button = document.getElementById("submitButton");

const supabaseUrl = "${env.SUPABASE_URL}";
const supabaseKey = "${env.SUPABASE_PUBLISHABLE_KEY}";

let recoveryToken = null;

async function initializeRecovery() {
  try {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    const recoveryError =
      hashParams.get("error_description") ||
      queryParams.get("error_description");

    if (recoveryError) {
      throw new Error("Your recovery link is invalid or expired. Please request a new one.");
    }

    const accessToken = hashParams.get("access_token");
    const tokenType = hashParams.get("type");

    if (accessToken && tokenType === "recovery") {
      recoveryToken = accessToken;
    } else {
      const code = queryParams.get("code");

      if (!code) {
        throw new Error("A valid password-reset link is required. Please request a new one.");
      }

      const response = await fetch(
        supabaseUrl + "/auth/v1/token?grant_type=pkce",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey
          },
          body: JSON.stringify({ auth_code: code })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.access_token) {
        throw new Error("Your recovery link is invalid or expired. Please request a new one.");
      }

      recoveryToken = result.access_token;
    }

    history.replaceState(null, "", window.location.pathname);
    form.style.display = "block";
    message.textContent = "Recovery link verified. Enter your new password.";

  } catch (error) {
    form.style.display = "none";
    message.textContent = error.message ||
      "Unable to verify your recovery link. Please request a new one.";
  }
}

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  const password = document.getElementById("password").value;
  const confirmation = document.getElementById("confirmPassword").value;

  if (password.length < 8) {
    message.textContent = "Password must contain at least 8 characters.";
    return;
  }

  if (password !== confirmation) {
    message.textContent = "The passwords do not match.";
    return;
  }

  button.disabled = true;
  message.textContent = "Updating your password...";

  try {
    const response = await fetch(supabaseUrl + "/auth/v1/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": "Bearer " + recoveryToken
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      throw new Error("Password update failed.");
    }

    message.textContent =
      "Password updated successfully. Redirecting to sign in...";

    setTimeout(function() {
      window.location.href = "/login?password_reset=success";
    }, 1800);

  } catch (error) {
    message.textContent =
      "Unable to update your password. Please request a new recovery link and try again.";
    button.disabled = false;
  }
});

initializeRecovery();
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
