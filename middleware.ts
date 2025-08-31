import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createSupabaseServerClient } from "./utils/supabase/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PROTECTED_ROUTES = [
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

export async function middleware(request: NextRequest) {
  // Create Supabase server client + initial response
  const { supabase, supabaseResponse } = createSupabaseServerClient(request);

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // API routes: only return supabaseResponse (skip i18n)
  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  // Apply i18n middleware
  const intlResponse = intlMiddleware(request);

  // Check session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const protectedPathnameRegex = new RegExp(
    `^/(${routing.locales.join("|")})(${PROTECTED_ROUTES.join("|")})($|/.*)`
  );

  if (protectedPathnameRegex.test(pathname)) {
    if (!session) {
      const locale = pathname.split("/")[1] || routing.defaultLocale;
      const redirectUrl = new URL(`/${locale}/sign-in`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Root path → redirect to /defaultLocale/home
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/home`, request.url)
    );
  }

  // Copy Supabase cookies into i18n response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, {
      ...cookie,
      path: "/",
    });
  });

  return intlResponse;
}

export const config = {
  matcher: [
    // Match all paths except for static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
