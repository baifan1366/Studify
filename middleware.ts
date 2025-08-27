import { NextResponse, NextRequest } from "next/server";

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root → /home
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Otherwise just continue
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"], // ignore api, _next, and static files
};
