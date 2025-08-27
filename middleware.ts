import {NextResponse, NextRequest} from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;

  if (pathname === '/') {
    const url = new URL(`/${routing.defaultLocale}/home`, request.url);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(en|zh)/:path*']
};
