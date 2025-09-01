import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createSupabaseServerClient } from "./utils/supabase/middleware";
import { routing } from "./i18n/routing";

// Define a simple type for the cookie object to avoid implicit any
type Cookie = {
  name: string;
  value: string;
  [key: string]: any;
};

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
  const { supabase, supabaseResponse } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;
  const locale = pathname.split("/")[1] || routing.defaultLocale;

  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  const intlResponse = intlMiddleware(request);

  const protectedPathnameRegex = new RegExp(
    `^/(${routing.locales.join("|")})(${PROTECTED_ROUTES.join("|")})($|/.*)`
  );

  if (protectedPathnameRegex.test(pathname)) {
    if (!session) {
      const redirectUrl = new URL(`/${locale}/sign-in`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("user_id", session.user.id)
      .single();

    if (profile && !profile.onboarded) {
      const onboardingUrl = new URL(`/${locale}/onboarding`, request.url);
      if (request.nextUrl.pathname !== `/${locale}/onboarding`) {
        return NextResponse.redirect(onboardingUrl);
      }
    }
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/home`, request.url)
    );
  }

  supabaseResponse.cookies.getAll().forEach((cookie: Cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, {
      ...cookie,
      path: "/",
    });
  });

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
