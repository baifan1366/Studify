import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { signAppJwt, generateJti } from "@/utils/auth/jwt";
import redis from "@/utils/redis/redis";

const APP_SESSION_COOKIE = "app_session";
const APP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Handle Supabase auth callbacks (OAuth, email confirmations, password resets, etc.)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const flowType = searchParams.get("type");
  let next = searchParams.get("next") ?? "/";

  // Validate next parameter
  if (!next.startsWith('/')) {
    next = '/';
  }

  // Extract role from URL parameters
  const requestedRole = searchParams.get("role") as "student" | "tutor" | null;

  console.log("[AUTH CALLBACK] Parameters:", {
    code: !!code,
    next,
    flowType,
    requestedRole,
    allParams: Object.fromEntries(searchParams.entries()),
  });

  // If no code, return error
  if (!code) {
    console.log("[AUTH CALLBACK] No code provided");
    return NextResponse.redirect(`${origin}/en/sign-in?error=no_code_provided`);
  }

  const supabase = await createClient();

  try {
    // Exchange the code for a session - this works for both OAuth and email confirmations
    // Supabase handles PKCE automatically on the server side
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.session) {
      console.error("[AUTH CALLBACK] Session exchange failed:", error?.message);
      return NextResponse.redirect(
        `${origin}/en/sign-in?error=session_exchange_failed&details=${encodeURIComponent(
          error?.message || "unknown_error"
        )}`
      );
    }

    const userId = data.session.user.id;
    const user = data.session.user;

    console.log("[AUTH CALLBACK] Session established for user:", userId);

    // Use admin client to manage profile
    const supabaseAdmin = await createAdminClient();

    // Check if profile exists
    let { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, display_name, email, onboarded, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    // If profile doesn't exist, create it
    if (!profile) {
      console.log("[AUTH CALLBACK] Creating new profile");

      const role = requestedRole || user.user_metadata?.role || "student";

      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.identities?.[0]?.identity_data?.name ||
        user.email?.split("@")[0] ||
        "User";

      const displayName =
        user.user_metadata?.name ||
        user.identities?.[0]?.identity_data?.name ||
        user.email?.split("@")[0] ||
        "User";

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.identities?.[0]?.identity_data?.avatar_url ||
        user.identities?.[0]?.identity_data?.picture;

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: userId,
          role: role,
          email: user.email,
          full_name: fullName,
          display_name: displayName,
          avatar_url: avatarUrl,
          email_verified: user.email_confirmed_at ? true : false,
          last_login: new Date().toISOString(),
          onboarded: false,
        })
        .select("id, role, full_name, display_name, email, onboarded, avatar_url")
        .single();

      if (createError) {
        // Handle unique constraint violation (profile already exists)
        if (createError.code === "23505") {
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id, role, full_name, display_name, email, onboarded, avatar_url")
            .eq("user_id", userId)
            .single();

          if (existingProfile) {
            profile = existingProfile;
          } else {
            console.error("[AUTH CALLBACK] Profile creation failed:", createError);
            return NextResponse.redirect(
              `${origin}/en/sign-in?error=profile_creation_failed`
            );
          }
        } else {
          console.error("[AUTH CALLBACK] Profile creation failed:", createError);
          return NextResponse.redirect(
            `${origin}/en/sign-in?error=profile_creation_failed`
          );
        }
      } else {
        profile = newProfile;
      }
    } else {
      console.log("[AUTH CALLBACK] Using existing profile");

      // Update last login and avatar if available
      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.identities?.[0]?.identity_data?.avatar_url ||
        user.identities?.[0]?.identity_data?.picture;

      const updateData: any = {
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (avatarUrl && !profile.avatar_url) {
        updateData.avatar_url = avatarUrl;
      }

      await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);
    }

    if (!profile) {
      console.error("[AUTH CALLBACK] Profile is null");
      return NextResponse.redirect(`${origin}/en/sign-in?error=profile_not_found`);
    }

    // Use the profile's role
    const role = profile.role || "student";
    const name =
      profile.display_name ||
      profile.full_name ||
      data.session.user.email?.split("@")[0];

    // Generate app JWT and store session in Redis
    const jti = generateJti();
    const jwt = await signAppJwt(
      { sub: userId, role, jti, name },
      APP_SESSION_TTL_SECONDS
    );
    await redis.set(`session:${jti}`, userId, {
      ex: APP_SESSION_TTL_SECONDS,
    });

    // Determine redirect path
    let redirectPath = next;

    if (flowType === "recovery") {
      redirectPath = next && next !== "/" ? next : "/en/reset-password";
    } else if (flowType === "signup") {
      if (!profile.onboarded) {
        const localeParts = next.split("/").filter(Boolean);
        const locale = localeParts[0] || "en";
        if (role === "tutor") {
          redirectPath = `/${locale}/tutor/step1`;
        } else if (role === "admin") {
          redirectPath = `/${locale}/admin/dashboard`;
        } else {
          redirectPath = `/${locale}/student`;
        }
      } else {
        redirectPath = next;
      }
    } else {
      // OAuth flow or other flows
      const localeParts = next.split("/").filter(Boolean);
      const locale = localeParts[0] || "en";
      const isLocaleRoot = localeParts.length === 1 && /^[a-z]{2}$/.test(localeParts[0]);

      if (!profile.onboarded) {
        if (role === "tutor") {
          redirectPath = `/${locale}/tutor/step1`;
        } else if (role === "admin") {
          redirectPath = `/${locale}/admin/dashboard`;
        } else {
          redirectPath = `/${locale}/student`;
        }
      } else {
        if (!isLocaleRoot && next !== "/") {
          redirectPath = next;
        } else {
          if (role === "student") {
            redirectPath = `/${locale}/home`;
          } else if (role === "tutor") {
            redirectPath = `/${locale}/tutor/dashboard`;
          } else if (role === "admin") {
            redirectPath = `/${locale}/admin/dashboard`;
          }
        }
      }
    }

    console.log("[AUTH CALLBACK] Redirecting to:", redirectPath);

    // Create redirect response with app_session cookie
    const response = NextResponse.redirect(`${origin}${redirectPath}`);
    response.cookies.set(APP_SESSION_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: APP_SESSION_TTL_SECONDS,
    });

    return response;
  } catch (error: any) {
    console.error("[AUTH CALLBACK] Unexpected error:", error);
    return NextResponse.redirect(
      `${origin}/en/sign-in?error=unexpected_error&details=${encodeURIComponent(
        error?.message || "unknown_error"
      )}`
    );
  }
}
