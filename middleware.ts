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

// Define a simple type for the cookie object to avoid implicit any
type Cookie = {
  name: string;
  value: string;
  [key: string]: any;
};

const intlMiddleware = createMiddleware(routing);

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
  "/student",
  "/tutor",
];

const TUTOR_ONLY_ROUTES = ["/dashboard"];

// All routes that require authentication
const PROTECTED_ROUTES = [...STUDENT_ONLY_ROUTES, ...TUTOR_ONLY_ROUTES];


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client
  const { supabase, supabaseResponse } = createSupabaseServerClient(request);

  // Get current user
  const { 
    data: { user }, 
  } = await supabase.auth.getUser();

  const locale = pathname.split("/")[1] || routing.defaultLocale;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;
  const locale = pathname.split("/")[1] || routing.defaultLocale;

  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  const intlResponse = intlMiddleware(request);

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
