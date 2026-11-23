import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

/**
 * POST /api/public/surveys/[surveyId]/submit
 * Proxies respondent survey submission to Django:
 * POST /api/public/surveys/<surveyId>/submit/
 *
 * Requirements:
 * - Uses djangoFetch with optional authentication (requiresAuth: true).
 *   Anonymous respondents can submit to surveys allowing anonymous responses,
 *   while authenticated respondents automatically carry credentials.
 * - Forwards incoming JSON payload without altering structure.
 * - Safely handles invalid JSON payloads with HTTP 400 Bad Request.
 * - Preserves upstream HTTP status codes (e.g. 201 Created) and validation/duplicate errors (HTTP 400).
 * - Critical IP security restriction: Does not forward X-Forwarded-For, X-Real-IP,
 *   or any other client-provided IP headers to Django.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    if (!surveyId || typeof surveyId !== 'string' || surveyId.trim() === '') {
      return NextResponse.json({ detail: 'Survey ID is required.' }, { status: 400 });
    }

    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json(
        { detail: 'Invalid JSON payload provided.' },
        { status: 400 }
      );
    }

    const res = await djangoFetch(DJANGO_ENDPOINTS.PUBLIC_SURVEYS.SUBMIT(surveyId), {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(jsonBody),
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = res.ok
      ? res.data
      : (res.error ?? { detail: 'Failed to submit survey responses.' });

    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
