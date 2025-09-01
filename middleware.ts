import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createSupabaseServerClient } from "./utils/supabase/middleware";
import { routing } from "./i18n/routing";

const STUDENT_ONLY_ROUTES = [
  "/classroom",
  "/community",
  "/courses",
  "/home",
  "/my",
  "/order-preview",
  "/students",
  "/success",
  "/tutoring",
  "/protected",
];

const TUTOR_ONLY_ROUTES = ["/dashboard"];

// All routes that require authentication
const PROTECTED_ROUTES = [...STUDENT_ONLY_ROUTES, ...TUTOR_ONLY_ROUTES];

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client
  const { supabase, supabaseResponse } = createSupabaseServerClient(request);

  // Get current user
  const { 
    data: { user }, 
  } = await supabase.auth.getUser();

  const locale = pathname.split("/")[1] || routing.defaultLocale;

  // Check if the path is a protected route
  const protectedPathnameRegex = new RegExp(
    `^/(${routing.locales.join("|")})(${PROTECTED_ROUTES.join("|")})($|/.*)`
  );

  if (protectedPathnameRegex.test(pathname)) {
    // 1. If no user, redirect to sign-in for any protected route
    if (!user) {
      return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
    }

    // 2. If user exists, perform stricter role-based checks
    const role = user.user_metadata?.role;
    const pathWithoutLocale = pathname.replace(`/${locale}`, "");

    // If a tutor tries to access a student-only route
    if (
      role === "tutor" &&
      STUDENT_ONLY_ROUTES.some((route) => pathWithoutLocale.startsWith(route))
    ) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    // If a non-tutor tries to access a tutor-only route
    if (
      role !== "tutor" &&
      TUTOR_ONLY_ROUTES.some((route) => pathWithoutLocale.startsWith(route))
    ) {
      return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
    }
  }

  // Handle root path
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/home`, request.url)
    );
  }

  // Run next-intl
  const intlResponse = intlMiddleware(request);

  // Sync Supabase cookies
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => intlResponse.cookies.set(cookie.name, cookie.value));

  return intlResponse;
}

export const config = {
  matcher: ["/", "/(en|zh|my)/:path*", "/((?!api|_next|.*\\..*).*)"],
};
