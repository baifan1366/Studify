import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextResponse } from "next/server";
import { verifyAppJwt } from "@/utils/auth/jwt";
import redis from "@/utils/redis/redis";
import { smartWarmupMiddleware } from "@/lib/langChain/smart-warmup";
import { createServerClient } from "@/utils/supabase/server";

// Centralized public path patterns for better performance and maintainability
const PUBLIC_PATHS = [
  /^\/$/, // root
  /^\/test/, // test pages
  /^\/auth\/callback/, // auth callbacks
  /^\/api\/currency/, // public currency API
  /^\/api\/video-processing\/warmup/, // warmup endpoints
  /^\/api\/video-processing\/steps\//, // QStash video processing steps
  /^\/api\/video-processing\/local-processor/, // local video processor
  /\/sign-in$/, // sign-in pages
  /\/forgot-password$/, // forgot-password pages
  /\/reset-password$/, // reset-password pages
  /\/verify-email$/, // email verification
  /\/(student|tutor|admin)\/sign-up$/, // role-based signup
  /\/(student|tutor|admin)(\/onboarding.*)?$/, // onboarding pages
  /\/process-webhook/, // QStash webhooks
  /\/queue-monitor/, // Queue monitoring
  /\/course\/webhook/, // Stripe webhooks
  /\/stripe\/webhook/, // Stripe webhooks
  /\/webhook$/, // Generic webhooks
  /^\/api\/ai\/coach\/cron\//, // AI coach cron jobs (streak, motivation, evening-retro, daily-plan)
  /^\/api\/tutor\/earnings\/release/, // Tutor earnings release cron
];

// Cache key generators
const SESSION_KEY = (jti: string) => `session:${jti}`;
const PROFILE_KEY = (userId: string) => `profile:${userId}`;

// Debug logger (only in development)
const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== "production") {
    if (data !== undefined) {
      //console.log(`[middleware] ${message}`, data);
    } else {
      //console.log(`[middleware] ${message}`);
    }
  }
};

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Smart warmup - only for embedding-related requests (non-blocking)
  smartWarmupMiddleware(request).catch((error: Error) => {
    console.error("Smart warmup middleware error:", error);
  });

  // Detect API paths, including locale-prefixed ones: /api/... or /{locale}/api/...
  const parts = pathname.split("/").filter(Boolean);
  const isApi = parts[0] === "api" || (parts.length > 1 && parts[1] === "api");
  const isAuthApi =
    (parts[0] === "api" && parts[1] === "auth") ||
    (parts[1] === "api" && parts[2] === "auth");

  // Static assets and basic bypasses
  const isStatic =
    pathname.startsWith("/_next") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname);
  const isWellKnown = pathname.startsWith("/.well-known");
  const isServiceWorker = pathname === "/sw.js";

  // Check if this is sign-in with mode=add (allow even for logged in users)
  const isAddAccountMode =
    pathname.includes("/sign-in") &&
    request.nextUrl.searchParams.get("mode") === "add";

  // Onboarding pages (allow access without onboarding check)
  const isOnboardingPage =
    /\/(?:[a-zA-Z-]+)?\/(student|tutor|admin)\/onboarding/.test(pathname) ||
    /\/(?:[a-zA-Z-]+)?\/(student|tutor|admin)\/.*onboarding/.test(pathname) ||
    /\/(?:[a-zA-Z-]+)?\/(student|tutor|admin)(?:\/)?$/.test(pathname);

  // Use centralized public path checking for better performance
  const isPublicPath = PUBLIC_PATHS.some((regex) => regex.test(pathname));

  // Early return for static assets, auth APIs, and basic bypasses
  if (
    isStatic ||
    isWellKnown ||
    isServiceWorker ||
    isAuthApi ||
    isAddAccountMode
  ) {
    // For API routes, bypass intl middleware to avoid locale rewriting
    return isApi ? NextResponse.next() : intlMiddleware(request);
  }

  // For public paths, handle intl middleware but skip auth
  if (isPublicPath || isOnboardingPage) {
    const intlResponse = isApi ? NextResponse.next() : intlMiddleware(request);
    return intlResponse;
  }

  // Handle intl middleware for non-API routes first
  let intlResponse = NextResponse.next();
  if (!isApi) {
    intlResponse = intlMiddleware(request);
    if (intlResponse.status !== 200) {
      return intlResponse;
    }
  }

  // Validate app_session cookie
  const token = request.cookies.get("app_session")?.value;
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // redirect to localized sign-in
    const url = request.nextUrl.clone();
    const locale = request.cookies.get("next-intl-locale")?.value || "en";
    url.pathname = `/${locale}/sign-in`;
    return NextResponse.redirect(url);
  }

  // Verify JWT and session stub
  try {
    const payload = await verifyAppJwt(token);
    const jti = String(payload.jti || "");
    const userId = String(payload.sub || "");
    const role = String(payload.role || "student");
    const name =
      payload && typeof payload.name === "string" ? payload.name : undefined;

    if (!jti || !userId) throw new Error("invalid token");

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      throw new Error("token expired");
    }

    // Check Redis for session revocation (consider caching this check)
    const exists = await redis.exists(SESSION_KEY(jti));
    if (!exists) throw new Error("session revoked");

    // Update online status and last seen (non-blocking)
    Promise.all([
      redis.set(`user:online:${userId}`, "true", { ex: 70 }),
      redis.set(`user:lastseen:${userId}`, Date.now().toString()),
    ]).catch((error: Error) => {
      console.error("[middleware] failed to update online status:", error);
    });

    // Inject headers for downstream API routes/handlers
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("x-user-id", userId);
    reqHeaders.set("x-user-role", role);

    // Check onboarding status for protected pages (skip for API routes and onboarding pages)
    if (!isApi && !isOnboardingPage) {
      try {
        // Try to get cached profile first
        const cachedProfileKey = PROFILE_KEY(userId);
        let profileData = await redis.get(cachedProfileKey);

        if (!profileData) {
          // Cache miss - fetch from database
          const supabase = await createServerClient();
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarded, role")
            .eq("user_id", userId)
            .single();

          if (profile) {
            profileData = JSON.stringify(profile);
            // Cache for 2 minute to reduce DB pressure
            await redis.setex(cachedProfileKey, 120, profileData);
          }
        }

        if (profileData && typeof profileData === "string") {
          const profile = JSON.parse(profileData) as {
            onboarded: boolean;
            role: string;
          };
          if (!profile.onboarded) {
            const url = request.nextUrl.clone();
            const locale =
              request.cookies.get("next-intl-locale")?.value || "en";
            const userRole = profile.role || role || "student";
            // Tutor onboarding uses /step1, student uses root path
            url.pathname =
              userRole === "tutor"
                ? `/${locale}/${userRole}/step1`
                : `/${locale}/${userRole}`;

            debugLog("redirecting to onboarding", {
              userId,
              role: userRole,
              pathname,
            });
            return NextResponse.redirect(url);
          }
        }
      } catch (error) {
        console.error("[middleware] failed to check onboarding status:", error);
        // Continue without onboarding check if there's an error
      }
    }

    // Create a next response carrying modified request headers
    const nextRes = NextResponse.next({ request: { headers: reqHeaders } });
    // Preserve cookies/headers set by intl middleware
    intlResponse.cookies.getAll().forEach((c) => nextRes.cookies.set(c));
    intlResponse.headers.forEach((v, k) => nextRes.headers.set(k, v));

    // Debug log of authorized user (development only)
    debugLog("authorized user", { id: userId, role, name });
    return nextRes;
  } catch (error) {
    // Improved error handling - log the actual error for debugging
    console.error("[middleware] auth error:", error);

    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    const locale = request.cookies.get("next-intl-locale")?.value || "en";
    url.pathname = `/${locale}/sign-in`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
