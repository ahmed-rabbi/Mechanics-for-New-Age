export async function onRequest(context) {
  const { request, env } = context;

  // Accept POST requests only.
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed." },
      { status: 405 }
    );
  }

  // Check required configuration.
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return Response.json(
      { error: "Registration is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const displayName =
      typeof body.display_name === "string"
        ? body.display_name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    // Validate the submitted information.
    if (!displayName || !email || !password) {
      return Response.json(
        {
          error: "Display name, email and password are required."
        },
        { status: 400 }
      );
    }

    if (displayName.length > 100) {
      return Response.json(
        { error: "Display name must not exceed 100 characters." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must contain at least 8 characters." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabaseUrl = env.SUPABASE_URL.replace(/\/+$/, "");

    // Register the member with Supabase Auth.
    const signupResponse = await fetch(
`${supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(
  "https://m4na-research.pages.dev/auth/verify"
)}`,      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          email,
          password,
          data: {
            display_name: displayName
          },
          gotrue_meta_security: {
            captcha_token: ""
          },
          options: {
            emailRedirectTo:
              "https://m4na-research.pages.dev/auth/verify"
          }
        })
      }
    );

    const signupData = await signupResponse.json();

    if (!signupResponse.ok) {
      return Response.json(
        {
          error:
            signupData.msg ||
            signupData.message ||
            signupData.error_description ||
            "Registration could not be completed. Please check your details."
        },
        { status: signupResponse.status }
      );
    }

    // Obtain the new Supabase user ID.
    const userId = signupData.user?.id;

    if (!userId) {
      return Response.json(
        {
          success: true,
          message:
            "Registration submitted. Please check your email for verification."
        },
        { status: 200 }
      );
    }

    // Create or update the central M4NA member profile.
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/m4na_member_profiles?on_conflict=user_id`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization":
            `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Prefer": "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          user_id: userId,
          display_name: displayName,
          email: email,
status: "active"        })
      }
    );

    if (!profileResponse.ok) {
      console.error(
        "M4NA profile creation failed:",
        await profileResponse.text()
      );

      return Response.json(
        {
          error:
            "Your account was created, but profile setup needs administrator attention."
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message:
          "Registration successful. Please check your email and verify your address before signing in."
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("M4NA registration error:", error);

    return Response.json(
      { error: "An unexpected registration error occurred." },
      { status: 500 }
    );
  }
}
