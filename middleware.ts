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
  "/student",
  "/tutor",
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
      .select("onboarded, role")
      .eq("user_id", session.user.id)
      .single();

    if (profile && !profile.onboarded) {
      if (profile.role === "tutor") {
        // 用户是 tutor，却访问 student 的 onboarding
        if (pathname.startsWith(`/${locale}/student`)) {
          return NextResponse.redirect(
            new URL(`/${locale}/tutor/step1`, request.url)
          );
        }
        const onboardingUrl = new URL(`/${locale}/tutor`, request.url);
        if (request.nextUrl.pathname !== onboardingUrl.pathname) {
          return NextResponse.redirect(onboardingUrl);
        }
      } else if (profile.role === "student") {
        // 用户是 student，却访问 tutor 的 onboarding
        if (pathname.startsWith(`/${locale}/tutor`)) {
          return NextResponse.redirect(
            new URL(`/${locale}/student/step1`, request.url)
          );
        }
        const onboardingUrl = new URL(`/${locale}/student`, request.url);
        if (request.nextUrl.pathname !== onboardingUrl.pathname) {
          return NextResponse.redirect(onboardingUrl);
        }
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
