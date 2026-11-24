import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/surveys/[surveyId]/coupons/validate
 * Proxies coupon validation to Django:
 * POST /api/surveys/<id>/coupons/validate/
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ surveyId?: string; id?: string }> | { surveyId?: string; id?: string } }
) {
  try {
    const resolvedParams = context?.params ? await Promise.resolve(context.params) : null;
    let cleanId = (resolvedParams?.surveyId || (resolvedParams as Record<string, string>)?.id || '').trim();

    // Fallback: extract surveyId from URL pathname if params did not resolve it
    if (!cleanId && request?.url) {
      const match = request.url.match(/\/api\/surveys\/([^/]+)/);
      if (match) {
        cleanId = decodeURIComponent(match[1]).trim();
      }
    }

    if (!cleanId || !UUID_REGEX.test(cleanId)) {
      return NextResponse.json(
        { detail: 'A valid survey UUID is required.' },
        { status: 400 }
      );
    }

    let body: unknown = undefined;
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }

    const res = await djangoFetch(DJANGO_ENDPOINTS.SURVEYS.COUPON_VALIDATE(cleanId), {
      method: 'POST',
      requiresAuth: true,
      body: body ? JSON.stringify(body) : undefined,
    });

    return NextResponse.json(res.data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { detail: `Failed to validate coupon: ${message}` },
      { status: 500 }
    );
  }
}
