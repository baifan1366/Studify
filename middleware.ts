import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createSupabaseServerClient } from "./utils/supabase/middleware";
import { routing } from "./i18n/routing";

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
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client + response
  const { supabase, supabaseResponse } = createSupabaseServerClient(request);

  // Get user session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Handle protected routes
  const protectedPathnameRegex = new RegExp(
    `^/(${routing.locales.join("|")})(${PROTECTED_ROUTES.join("|")})($|/.*)`
  );
  if (protectedPathnameRegex.test(pathname)) {
    if (!session) {
      const locale = pathname.split("/")[1] || routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
    }
  }

  // Redirect root to default locale home
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/home`, request.url)
    );
  }

  // Run next-intl middleware
  const intlResponse = intlMiddleware(request);

  // Sync Supabase cookies with next-intl response
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => intlResponse.cookies.set(cookie.name, cookie.value));

  return intlResponse;
}

export const config = {
  matcher: ["/", "/(en|zh|my)/:path*", "/((?!api|_next|.*\\..*).*)"],
};
