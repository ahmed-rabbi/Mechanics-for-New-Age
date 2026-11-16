export async function onRequestPost({ request, env }) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
      return Response.json(
        { error: "Authentication service is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const redirectTo =
      "https://m4na-research.pages.dev/reset-password";

    const response = await fetch(
      env.SUPABASE_URL +
      "/auth/v1/recover?redirect_to=" +
      encodeURIComponent(redirectTo),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ email })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("M4NA password recovery error:", error);

      return Response.json(
        { error: "Unable to send the recovery email. Please try again later." },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message:
        "If an account exists for this email, a password-reset link will be sent."
    });

  } catch (error) {
    console.error("M4NA forgot password error:", error);

    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
