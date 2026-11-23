import { cookies } from 'next/headers';
import {
  COOKIE_NAMES,
  defaultHttpOnlyCookieOptions,
  defaultPublicCookieOptions,
} from '@/lib/auth/cookies';
import { DJANGO_BASE_URL, DJANGO_ENDPOINTS } from '@/config/endpoints';

const DJANGO_API_URL = DJANGO_BASE_URL;

interface DjangoRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export interface DjangoResponse<T = unknown> {
  data: T | null;
  status: number;
  ok: boolean;
  error?: unknown;
}

// In-flight refresh promise mutex to prevent concurrent refresh race conditions
let activeRefreshPromise: Promise<{ access: string; refresh: string } | null> | null = null;

async function executeTokenRefresh(refreshToken: string): Promise<{ access: string; refresh: string } | null> {
  try {
    const res = await fetch(`${DJANGO_API_URL}${DJANGO_ENDPOINTS.AUTH.TOKEN_REFRESH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.access && data.refresh) {
      return { access: data.access, refresh: data.refresh };
    }
    return null;
  } catch {
    return null;
  }
}

async function rotateTokens(refreshToken: string): Promise<{ access: string; refresh: string } | null> {
  if (!activeRefreshPromise) {
    activeRefreshPromise = executeTokenRefresh(refreshToken).finally(() => {
      activeRefreshPromise = null;
    });
  }
  return activeRefreshPromise;
}

export async function djangoFetch<T = unknown>(
  endpoint: string,
  options: DjangoRequestOptions = {}
): Promise<DjangoResponse<T>> {
  const { requiresAuth = true, headers: customHeaders, ...restOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${DJANGO_API_URL}${endpoint}`;

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && !(restOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = null;
  }

  const accessToken = cookieStore?.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore?.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

  if (requiresAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, {
    ...restOptions,
    headers,
  });

  // If 401 Unauthorized, attempt token refresh and retry once
  if (response.status === 401 && requiresAuth && refreshToken) {
    const newTokens = await rotateTokens(refreshToken);

    if (newTokens && cookieStore) {
      try {
        cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, newTokens.access, {
          ...defaultHttpOnlyCookieOptions,
          maxAge: 6 * 24 * 60 * 60,
        });
        cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, newTokens.refresh, {
          ...defaultHttpOnlyCookieOptions,
          maxAge: 30 * 24 * 60 * 60,
        });
        cookieStore.set(COOKIE_NAMES.SESSION_ACTIVE, '1', {
          ...defaultPublicCookieOptions,
          maxAge: 30 * 24 * 60 * 60,
        });
      } catch {
        // Ignored if cookie store is read-only in current execution context
      }

      headers.set('Authorization', `Bearer ${newTokens.access}`);
      response = await fetch(url, {
        ...restOptions,
        headers,
      });
    } else if (!newTokens && cookieStore) {
      // Refresh token failed/blacklisted: clear expired credentials
      try {
        cookieStore.delete(COOKIE_NAMES.ACCESS_TOKEN);
        cookieStore.delete(COOKIE_NAMES.REFRESH_TOKEN);
        cookieStore.delete(COOKIE_NAMES.SESSION_ACTIVE);
      } catch {
        // Ignored
      }
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  let data: T | null = null;
  let error: unknown = undefined;

  try {
    if (isJson) {
      const parsed = await response.json();
      if (response.ok) {
        data = parsed;
      } else {
        error = parsed;
      }
    } else {
      const text = await response.text();
      if (!response.ok) {
        error = text;
      }
    }
  } catch (err) {
    error = err;
  }

  return {
    data,
    status: response.status,
    ok: response.ok,
    error,
  };
}
