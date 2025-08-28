import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createSupabaseServerClient } from "./utils/supabase/middleware";
import { routing } from "./i18n/routing";

const PROTECTED_ROUTES = ["/home", "/dashboard"];
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
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) && !session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Redirect root to default locale home
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${routing.defaultLocale}/home`, request.url));
  }

  // Run next-intl middleware
  const intlResponse = intlMiddleware(request);

  // Sync Supabase cookies with next-intl response
  supabaseResponse.cookies.getAll().forEach((cookie) =>
    intlResponse.cookies.set(cookie.name, cookie.value)
  );

  return intlResponse;
}

export const config = {
  matcher: ["/", "/(en|zh|my)/:path*", "/((?!api|_next|.*\\..*).*)"],
};
