export async function onRequest({ request, env }) {

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed." },
      { status: 405 }
    );
  }

  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY
  ) {
    return Response.json(
      { error: "Email confirmation is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabaseUrl =
      env.SUPABASE_URL.replace(/\/+$/, "");

    const response = await fetch(
      `${supabaseUrl}/auth/v1/resend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          type: "signup",
          email: email,
          options: {
            emailRedirectTo:
              "https://m4na-research.pages.dev/auth/verify"
          }
        })
      }
    );

    if (!response.ok) {
      const errorDetails = await response.text();

      console.error(
        "M4NA confirmation resend failed:",
        response.status,
        errorDetails
      );

      return Response.json(
        {
          error:
            "The confirmation email could not be sent. Please try again later."
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        message:
          "If confirmation is available for this account, an email will be sent. Please check your inbox."
      },
      { status: 200 }
    );

  } catch (error) {

    console.error(
      "M4NA confirmation resend error:",
      error.message
    );

    return Response.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
