import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

/**
 * GET /api/public/surveys/[surveyId]
 * Proxies respondent survey retrieval to Django:
 * GET /api/public/surveys/<surveyId>/
 *
 * Requirements:
 * - Uses djangoFetch with optional authentication (requiresAuth: true).
 *   Anonymous respondents can access public surveys while authenticated
 *   respondents automatically forward credentials to participate in private surveys.
 * - Preserves upstream HTTP status codes and response bodies (including 200, 400, 403, 404).
 * - Does not forward client IP headers (per critical IP security restriction).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    if (!surveyId || typeof surveyId !== 'string' || surveyId.trim() === '') {
      return NextResponse.json({ detail: 'Survey ID is required.' }, { status: 400 });
    }

    const res = await djangoFetch(DJANGO_ENDPOINTS.PUBLIC_SURVEYS.DETAIL(surveyId), {
      method: 'GET',
      requiresAuth: true,
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = res.ok
      ? res.data
      : (res.error ?? { detail: 'Failed to retrieve public survey.' });

    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
