export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed." },
      { status: 405 }
    );
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return Response.json(
      { error: "Email verification is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";

    if (!email || !/^\d{6}$/.test(token)) {
      return Response.json(
        { error: "Please provide your email address and six-digit verification code." },
        { status: 400 }
      );
    }

    const supabaseUrl = env.SUPABASE_URL.replace(/\/+$/, "");

    const verificationResponse = await fetch(
      `${supabaseUrl}/auth/v1/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          email: email,
          token: token,
          type: "email"
        })
      }
    );

    const verificationData = await verificationResponse.json();

    if (!verificationResponse.ok) {
      return Response.json(
        {
          error:
            verificationData.msg ||
            verificationData.message ||
            verificationData.error_description ||
            "The verification code is invalid or has expired."
        },
        { status: 400 }
      );
    }

    if (!verificationData.access_token) {
      return Response.json(
        { error: "Verification succeeded, but no sign-in session was returned." },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Email address verified successfully.",
        access_token: verificationData.access_token
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("M4NA email code verification error:", error);

    return Response.json(
      { error: "An unexpected verification error occurred." },
      { status: 500 }
    );
  }
}
