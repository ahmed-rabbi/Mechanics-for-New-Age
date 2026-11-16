export async function onRequest(context) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>M4NA Email Verification</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f7f8f3;
      font-family: Arial, sans-serif;
      color: #26321b;
    }
    .panel {
      width: min(90%, 440px);
      padding: 38px 28px;
      background: #ffffff;
      border: 1px solid #e5eadb;
      border-radius: 14px;
      text-align: center;
      box-shadow: 0 8px 30px rgba(38, 50, 27, 0.07);
    }
    h1 { font-size: 25px; }
    p { line-height: 1.7; color: #59634e; }
    .mark { color: #78963d; font-weight: bold; }
  </style>
</head>
<body>
  <main class="panel">
    <div class="mark">MECHANICS FOR NEW AGE</div>
    <h1>Email verification</h1>
    <p id="message">Checking your verification status. Please wait...</p>
  </main>

  <script>
    (async function () {
      const message = document.getElementById("message");

      try {
        const fragment = new URLSearchParams(
          window.location.hash.substring(1)
        );

        const accessToken = fragment.get("access_token");
        const error = fragment.get("error_description") ||
                      fragment.get("error");

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        if (error) {
          throw new Error(error.replace(/\\+/g, " "));
        }

        if (!accessToken) {
          throw new Error(
            "No verification session was received. Please use the confirmation link in your email again."
          );
        }

        const response = await fetch("/auth/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            access_token: accessToken
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "We could not complete your sign-in."
          );
        }

        message.textContent =
          "Your email has been verified. Your M4NA account is ready.";

        setTimeout(function () {
          window.location.href = "/dashboard";
        }, 1800);

      } catch (error) {
        message.textContent = error.message;
      }
    })();
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
