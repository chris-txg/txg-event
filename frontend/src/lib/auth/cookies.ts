import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  SESSION_ACTIVE: 'session_active',
} as const;

// SimpleJWT lifetime alignments
const ACCESS_TOKEN_MAX_AGE = 6 * 24 * 60 * 60; // 6 days
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

const isProduction = process.env.NODE_ENV === 'production';

export const defaultHttpOnlyCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

export const defaultPublicCookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Attach tokens and session marker to a NextResponse.
 */
export function setAuthCookies(
  response: NextResponse,
  tokens: { access: string; refresh: string }
): NextResponse {
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, tokens.access, {
    ...defaultHttpOnlyCookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, tokens.refresh, {
    ...defaultHttpOnlyCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  response.cookies.set(COOKIE_NAMES.SESSION_ACTIVE, '1', {
    ...defaultPublicCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return response;
}

/**
 * Remove tokens and session marker from a NextResponse.
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, '', {
    ...defaultHttpOnlyCookieOptions,
    maxAge: 0,
  });

  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, '', {
    ...defaultHttpOnlyCookieOptions,
    maxAge: 0,
  });

  response.cookies.set(COOKIE_NAMES.SESSION_ACTIVE, '', {
    ...defaultPublicCookieOptions,
    maxAge: 0,
  });

  return response;
}

/**
 * Read tokens from the server-side cookies store.
 */
export async function getServerAuthTokens(): Promise<{
  access: string | null;
  refresh: string | null;
}> {
  const cookieStore = await cookies();
  const access = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
  const refresh = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;
  return { access, refresh };
}
