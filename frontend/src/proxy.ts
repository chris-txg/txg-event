import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAMES } from '@/lib/auth/cookies';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession =
    request.cookies.has(COOKIE_NAMES.SESSION_ACTIVE) ||
    request.cookies.has(COOKIE_NAMES.ACCESS_TOKEN);

  const isProtectedPath = pathname.startsWith('/profile');
  const isAuthPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  if (isProtectedPath && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && hasSession) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return NextResponse.next();
}

// Next.js 16 export compatibility
export default proxy;
export { proxy as middleware };

export const config = {
  matcher: [
    '/profile/:path*',
    '/login',
    '/register/:path*',
    '/forgot-password',
    '/reset-password',
  ],
};
