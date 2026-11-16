export async function onRequest({ request, env }) {

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed." },
      { status: 405 }
    );
  }

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

    const verificationUrl =
      "https://m4na-research.pages.dev/auth/verify";

    // Create the central Supabase account.
    const signupResponse = await fetch(
      `${supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(verificationUrl)}`,
      {
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

    // Check whether a central member profile already exists.
    const existingResponse = await fetch(
      `${supabaseUrl}/rest/v1/m4na_member_profiles` +
      `?user_id=eq.${encodeURIComponent(userId)}` +
      `&select=user_id,status`,
      {
        headers: {
          "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!existingResponse.ok) {
      console.error(
        "M4NA existing profile check failed:",
        await existingResponse.text()
      );

      return Response.json(
        { error: "Unable to verify your member profile." },
        { status: 500 }
      );
    }

    const existingProfiles = await existingResponse.json();

    if (existingProfiles.length > 0) {
      const existingProfile = existingProfiles[0];

      // Never reactivate a suspended or banned member.
      if (existingProfile.status !== "active") {
        return Response.json(
          {
            error: "This M4NA account is not currently permitted to register or sign in."
          },
          { status: 403 }
        );
      }

      return Response.json(
        {
          success: true,
          message:
            "Registration submitted. Please check your email for verification."
        },
        { status: 200 }
      );
    }

    // Create a new profile without overwriting existing profiles.
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/m4na_member_profiles`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          user_id: userId,
          display_name: displayName,
          email: email,
          status: "active"
        })
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
