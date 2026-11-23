import { NextResponse } from 'next/server';
import { getServerAuthTokens, setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';
import { DJANGO_BASE_URL, DJANGO_ENDPOINTS } from '@/config/endpoints';

export async function POST() {
  try {
    const { refresh } = await getServerAuthTokens();

    if (!refresh) {
      const response = NextResponse.json(
        { detail: 'No refresh token available' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    const res = await fetch(`${DJANGO_BASE_URL}${DJANGO_ENDPOINTS.AUTH.TOKEN_REFRESH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      const response = NextResponse.json(
        { detail: 'Token refresh failed' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    const data = await res.json();
    const response = NextResponse.json({ message: 'Token rotated successfully' }, { status: 200 });
    setAuthCookies(response, { access: data.access, refresh: data.refresh });
    return response;
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
