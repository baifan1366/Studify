import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { signAppJwt, generateJti } from "@/utils/auth/jwt";
import redis from "@/utils/redis/redis";

const APP_SESSION_COOKIE = "app_session";
const APP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Handle Supabase auth callbacks (email confirmations, password resets, etc.)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const flowType = searchParams.get("type");
  const provider = searchParams.get("provider");
  const redirectTo = searchParams.get("redirect_to");
  let next = searchParams.get("next") ?? "/";

  // Extract role from multiple possible sources
  let requestedRole = searchParams.get("role") as "student" | "tutor" | null;

  // If role not in direct params, check redirect_to URL
  if (!requestedRole && redirectTo) {
    try {
      const redirectUrl = new URL(decodeURIComponent(redirectTo));
      requestedRole = redirectUrl.searchParams.get("role") as
        | "student"
        | "tutor"
        | null;
    } catch (e) {
      console.log(
        "[AUTH CALLBACK] Failed to parse redirect_to for role:",
        redirectTo
      );
    }
  }

  // If still no role, check the state parameter (OAuth providers may encode it there)
  if (!requestedRole) {
    const state = searchParams.get("state");
    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        requestedRole = stateData.role as "student" | "tutor" | null;
      } catch (e) {
        console.log("[AUTH CALLBACK] Failed to parse state for role");
      }
    }
  }

  console.log("[AUTH CALLBACK] Extracted role:", requestedRole);

  // Handle different authentication flows
  let code: string | null = null;
  if (flowType === "recovery") {
    // Password reset flow uses token_hash
    code = searchParams.get("token_hash");
  } else if (provider) {
    // OAuth flow uses code or access_token
    code = searchParams.get("code") || searchParams.get("access_token");
  } else {
    // Email magic link or other flows
    code = searchParams.get("code");
  }

  // PKCE verification for OAuth flows
  const codeVerifier = provider ? searchParams.get("code_verifier") : null;

  // Log the full URL for debugging
  console.log("[AUTH CALLBACK] Full callback URL:", request.url);

  // Parse next from redirect_to if needed
  if (!searchParams.get("next") && redirectTo) {
    try {
      const redirectUrl = new URL(decodeURIComponent(redirectTo));
      next = redirectUrl.searchParams.get("next") ?? "/";
    } catch (e) {
      console.log("[AUTH CALLBACK] Failed to parse redirect_to:", redirectTo);
    }
  }

  console.log("[AUTH CALLBACK] Parameters:", {
    code: !!code,
    next,
    flowType,
    provider,
    origin,
    requestedRole,
    hasPkceVerifier: !!codeVerifier,
    rawRedirectTo: searchParams.get("redirect_to"),
    allParams: Object.fromEntries(searchParams.entries()),
  });

  if (code) {
    const supabase = await createClient();

    try {
      console.log("[AUTH CALLBACK] Attempting session exchange:", {
        codeLength: code.length,
        codePrefix: code.substring(0, 10) + "...",
        flowType,
        next,
        provider: searchParams.get("provider") || "unknown",
      });

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      console.log("[AUTH CALLBACK] Session exchange result:", {
        success: !error && !!data?.session,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.status,
        hasSession: !!data?.session,
        userEmail: data?.session?.user?.email,
      });

      if (!error && data?.session) {
        const userId = data.session.user.id;
        const user = data.session.user;

        console.log("[AUTH CALLBACK] User session established:", {
          userId,
          email: user.email,
          provider: user.app_metadata?.provider,
        });

        // Use admin client to ensure profile exists (bypass RLS)
        let supabaseAdmin;
        try {
          supabaseAdmin = await createAdminClient();
        } catch (adminError: any) {
          console.error(
            "[AUTH CALLBACK] Failed to create admin client:",
            adminError
          );
          return NextResponse.redirect(
            `${origin}/en/sign-in?error=admin_client_failed&details=${encodeURIComponent(
              adminError.message || "Failed to create admin client"
            )}`
          );
        }

        // Check if profile exists
        let { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, role, full_name, display_name, email, onboarded")
          .eq("user_id", userId)
          .maybeSingle();

        // If profile doesn't exist, create it
        if (!profile) {
          console.log(
            "[AUTH CALLBACK] Profile not found, creating new profile",
            {
              userId,
              requestedRole,
              provider: user.app_metadata?.provider,
            }
          );

          // Determine role
          const role = requestedRole || user.user_metadata?.role || "student";

          // Extract user information from OAuth data
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.display_name ||
            user.identities?.[0]?.identity_data?.name ||
            user.identities?.[0]?.identity_data?.full_name ||
            user.email?.split("@")[0] ||
            "User";

          const displayName =
            user.user_metadata?.name ||
            user.user_metadata?.display_name ||
            user.identities?.[0]?.identity_data?.name ||
            user.email?.split("@")[0] ||
            "User";

          const avatarUrl =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            user.identities?.[0]?.identity_data?.avatar_url ||
            user.identities?.[0]?.identity_data?.picture;

          console.log("[AUTH CALLBACK] Creating profile with data:", {
            userId,
            role,
            email: user.email,
            fullName,
            displayName,
            hasAvatar: !!avatarUrl,
          });

          // Create profile using admin client with timeout
          try {
            const { data: newProfile, error: createError } =
              (await Promise.race([
                supabaseAdmin
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
                    onboarded: false, // New users need onboarding
                  })
                  .select("id, role, full_name, display_name, email, onboarded")
                  .single(),
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Profile creation timeout")),
                    10000
                  )
                ),
              ])) as any;

            if (createError) {
              console.error("[AUTH CALLBACK] Failed to create profile:", {
                error: createError,
                code: createError.code,
                message: createError.message,
              });

              // If it's a unique constraint violation, profile might already exist
              if (createError.code === "23505") {
                const { data: existingProfile } = await supabaseAdmin
                  .from("profiles")
                  .select("id, role, full_name, display_name, email, onboarded")
                  .eq("user_id", userId)
                  .single();

                if (existingProfile) {
                  console.log(
                    "[AUTH CALLBACK] Profile already exists (unique constraint)"
                  );
                  profile = existingProfile;
                } else {
                  throw createError;
                }
              } else {
                throw createError;
              }
            } else {
              console.log("[AUTH CALLBACK] Profile created successfully:", {
                id: newProfile.id,
                role: newProfile.role,
              });
              profile = newProfile;
            }
          } catch (createError: any) {
            console.error(
              "[AUTH CALLBACK] Profile creation error:",
              createError
            );
            return NextResponse.redirect(
              `${origin}/en/sign-in?error=profile_creation_failed&details=${encodeURIComponent(
                createError.message || "Unknown error"
              )}`
            );
          }
        } else {
          console.log("[AUTH CALLBACK] Profile found:", {
            id: profile.id,
            role: profile.role,
          });

          // Update last login (non-blocking)
          Promise.resolve(
            supabaseAdmin
              .from("profiles")
              .update({
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId)
          )
            .then(() => console.log("[AUTH CALLBACK] Last login updated"))
            .catch((err: any) =>
              console.error("[AUTH CALLBACK] Failed to update last login:", err)
            );
        }

        if (!profile) {
          console.error("[AUTH CALLBACK] Profile is null after ensure");
          return NextResponse.redirect(
            `${origin}/en/sign-in?error=profile_not_found`
          );
        }

        const role = profile?.role || "student";
        const name =
          profile?.display_name ||
          profile?.full_name ||
          data.session.user.email?.split("@")[0];

        console.log("[AUTH CALLBACK] User profile:", { userId, role, name });

        // Generate app JWT and store session in Redis
        const jti = generateJti();
        const jwt = await signAppJwt(
          { sub: userId, role, jti, name },
          APP_SESSION_TTL_SECONDS
        );
        await redis.set(`session:${jti}`, userId, {
          ex: APP_SESSION_TTL_SECONDS,
        });

        console.log("[AUTH CALLBACK] App session created:", {
          jti: jti.substring(0, 10) + "...",
        });

        // Determine redirect based on the type of auth flow and onboarding status
        let redirectPath = next;

        if (flowType === "recovery") {
          // Password reset flow - use the next parameter which contains the locale
          // If next parameter is provided (e.g., /en/reset-password), use it
          // Otherwise, fallback to /en/reset-password
          redirectPath = next && next !== "/" ? next : "/en/reset-password";
          console.log("[AUTH CALLBACK] Password reset redirect:", {
            next,
            redirectPath,
            sessionUser: data.session.user?.email,
            sessionId: data.session.access_token?.substring(0, 20) + "...",
          });
        } else if (flowType === "signup") {
          // Email verification flow - redirect to onboarding or dashboard
          redirectPath = next;
        } else if (!profile.onboarded) {
          // New user needs onboarding
          const locale = next.split("/")[1] || "en";
          redirectPath = `/${locale}/onboarding`;
          console.log("[AUTH CALLBACK] New user, redirecting to onboarding:", {
            userId,
            onboarded: profile.onboarded,
            redirectPath,
          });
        }

        console.log(
          "[AUTH CALLBACK] Final redirect:",
          `${origin}${redirectPath}`
        );

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
      } else {
        console.log("[AUTH CALLBACK] Session exchange failed:", {
          hasError: !!error,
          errorMessage: error?.message,
          hasSession: !!data?.session,
          flowType,
          next,
        });
        // More specific error message for debugging
        return NextResponse.redirect(
          `${origin}/en/sign-in?error=session_exchange_failed&details=${encodeURIComponent(
            error?.message || "unknown_error"
          )}`
        );
      }
    } catch (error: any) {
      console.error("[AUTH CALLBACK] Unexpected error:", error);
      const errorMessage = error?.message || "unknown_error";
      return NextResponse.redirect(
        `${origin}/en/sign-in?error=unexpected_error&details=${encodeURIComponent(
          errorMessage
        )}`
      );
    }
  }

  // If there's an error or no code, redirect to sign-in with error
  console.log("[AUTH CALLBACK] No code provided in callback");
  return NextResponse.redirect(`${origin}/en/sign-in?error=no_code_provided`);
}
