export interface BffResponse<T = unknown> {
  data: T | null;
  status: number;
  ok: boolean;
  error?: unknown;
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH !== undefined
  ? process.env.NEXT_PUBLIC_BASE_PATH
  : '/txgevent';

export function resolveBffUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanBase = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
  if (!cleanBase) {
    return endpoint;
  }
  if (endpoint === cleanBase || endpoint.startsWith(`${cleanBase}/`)) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

export async function bffFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<BffResponse<T>> {
  const { headers: customHeaders, ...restOptions } = options;

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && !(restOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const targetUrl = resolveBffUrl(endpoint);

  try {
    const response = await fetch(targetUrl, {
      ...restOptions,
      headers,
      credentials: 'same-origin',
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    let data: T | null = null;
    let error: unknown = undefined;

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

    return {
      data,
      status: response.status,
      ok: response.ok,
      error,
    };
  } catch (err) {
    return {
      data: null,
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
