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
    const password = String(body.password || "");

    if (!email || !password) {
      return Response.json(
        { error: "Please enter your email address and password." },
        { status: 400 }
      );
    }

    const supabaseResponse = await fetch(
      `${env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const result = await supabaseResponse.json();

    if (!supabaseResponse.ok || !result.access_token) {
      let errorMessage = "Invalid email address or password.";

      if (
        result.code === "email_not_confirmed" ||
        result.msg === "Email not confirmed"
      ) {
        errorMessage = "Please verify your email address before signing in.";
      }

      return Response.json(
        { error: errorMessage },
        {
          status: supabaseResponse.status === 400 ? 401 : supabaseResponse.status,
          headers: { "Cache-Control": "no-store" }
        }
      );
    }

    return Response.json(
      {
        access_token: result.access_token
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return Response.json(
      { error: "Unable to process your sign-in request. Please try again." },
      { status: 500 }
    );
  }
}
