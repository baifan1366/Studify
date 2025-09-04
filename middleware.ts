import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextResponse } from "next/server";
import { verifyAppJwt } from "@/utils/auth/jwt";
import redis from "@/utils/redis/redis";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Detect API paths, including locale-prefixed ones: /api/... or /{locale}/api/...
  const parts = pathname.split('/').filter(Boolean);
  const isApi = parts[0] === 'api' || (parts.length > 1 && parts[1] === 'api');
  const isAuthApi = (parts[0] === 'api' && parts[1] === 'auth') || (parts[1] === 'api' && parts[2] === 'auth');

  // For API routes, bypass intl middleware to avoid locale rewriting on /api
  const intlResponse = isApi ? NextResponse.next() : intlMiddleware(request);
  if (!isApi && intlResponse.status !== 200) {
    return intlResponse;
  }

  // Allowlist: static assets and auth APIs/pages
  const isStatic = pathname.startsWith("/_next") || /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname);
  const isWellKnown = pathname.startsWith("/.well-known");
  // Auth callback routes (bypass middleware to preserve OAuth parameters)
  const isAuthCallback = pathname.startsWith("/auth/callback") || pathname.includes("/auth/callback") || /\/[a-z]{2}\/auth\/callback/.test(pathname);
  // Public auth pages: /{locale}/sign-in, /{locale}/verify-email, and nested /{locale}/{role}/sign-up
  const isPublicAuthPage =
    /\/(?:[a-zA-Z-]+)?\/(sign-in|verify-email)$/.test(pathname) ||
    /\/(?:[a-zA-Z-]+)?\/(student|tutor|admin)\/sign-up$/.test(pathname);
  const isTestOrPublic = pathname === "/" || pathname.startsWith("/test");

  if (isStatic || isWellKnown || isAuthApi || isAuthCallback || isPublicAuthPage || isTestOrPublic) {
    return intlResponse;
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
    const name = payload && typeof payload.name === 'string' ? payload.name : undefined;

    if (!jti || !userId) throw new Error("invalid token");

    const exists = await redis.exists(`session:${jti}`);
    if (!exists) throw new Error("session revoked");

    // Inject headers for downstream API routes/handlers
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("x-user-id", userId);
    reqHeaders.set("x-user-role", role);

    // Create a next response carrying modified request headers
    const nextRes = NextResponse.next({ request: { headers: reqHeaders } });
    // Preserve cookies/headers set by intl middleware
    intlResponse.cookies.getAll().forEach((c) => nextRes.cookies.set(c));
    intlResponse.headers.forEach((v, k) => nextRes.headers.set(k, v));

    // Debug log of authorized user
    console.log(`[middleware] authorized user`, { id: userId, role, name });
    return nextRes;
  } catch (_e) {
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
