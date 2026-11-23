import { NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

/**
 * GET /api/surveys/pricing-options
 * Proxies request to Django backend:
 * GET /api/surveys/pricing-options/
 */
export async function GET() {
  try {
    const res = await djangoFetch(DJANGO_ENDPOINTS.SURVEYS.PRICING_OPTIONS, {
      method: 'GET',
      requiresAuth: true,
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = res.ok
      ? res.data
      : (res.error ?? { detail: 'Failed to fetch survey pricing options.' });

    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
