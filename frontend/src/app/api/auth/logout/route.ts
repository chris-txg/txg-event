import { NextResponse } from 'next/server';
import { clearAuthCookies, getServerAuthTokens } from '@/lib/auth/cookies';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST() {
  try {
    const { access, refresh } = await getServerAuthTokens();

    // Call Django logout endpoint to blacklist refresh token if present
    if (refresh) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (access) {
          headers['Authorization'] = `Bearer ${access}`;
        }

        await fetch(`${DJANGO_API_URL}/api/auth/logout/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ refresh }),
        });
      } catch {
        // Backend failure or network timeout should still clear client session
      }
    }

    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    clearAuthCookies(response);
    return response;
  } catch (err) {
    const response = NextResponse.json(
      { detail: err instanceof Error ? err.message : 'Error during logout' },
      { status: 500 }
    );
    clearAuthCookies(response);
    return response;
  }
}
