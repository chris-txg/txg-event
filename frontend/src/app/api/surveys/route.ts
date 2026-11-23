import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

/**
 * GET /api/surveys
 * Proxies request to Django GET /api/surveys/?mine=true
 * Strictly supports verified filters: status, project, visibility, page, page_size.
 * Unsupported search filter is explicitly omitted.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forwardParams = new URLSearchParams();

    // Organiser global view must always include mine=true to see draft and closed surveys
    forwardParams.set('mine', 'true');

    const allowedFilters = ['status', 'project', 'visibility', 'page', 'page_size'];
    for (const key of allowedFilters) {
      const value = searchParams.get(key);
      if (value) {
        forwardParams.set(key, value);
      }
    }

    const endpoint = `${DJANGO_ENDPOINTS.SURVEYS.LIST_CREATE}?${forwardParams.toString()}`;
    const res = await djangoFetch(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to fetch surveys' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/surveys
 * Proxies request to Django POST /api/surveys/
 * Creates a new draft survey associated with an EventProject.
 */
export async function POST(request: NextRequest) {
  try {
    const jsonBody = await request.json();

    const res = await djangoFetch(DJANGO_ENDPOINTS.SURVEYS.LIST_CREATE, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(jsonBody),
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to create survey' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
