import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAMES } from '@/lib/auth/cookies';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession =
    request.cookies.has(COOKIE_NAMES.SESSION_ACTIVE) ||
    request.cookies.has(COOKIE_NAMES.ACCESS_TOKEN);

  const isProtectedPath =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/projects');
  const isAuthPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  if (isProtectedPath && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && hasSession) {
    const servicesUrl = request.nextUrl.clone();
    servicesUrl.pathname = '/services';
    return NextResponse.redirect(servicesUrl);
  }

  return NextResponse.next();
}

// Next.js 16 export compatibility
export default proxy;
export { proxy as middleware };

export const config = {
  matcher: [
    '/profile/:path*',
    '/services/:path*',
    '/projects/:path*',
    '/login',
    '/register/:path*',
    '/forgot-password',
    '/reset-password',
  ],
};
