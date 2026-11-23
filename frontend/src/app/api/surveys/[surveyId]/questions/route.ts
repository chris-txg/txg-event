import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

/**
 * POST /api/surveys/[surveyId]/questions
 * Proxies request to Django POST /api/surveys/<id>/questions/
 * Adds a new question (and optional choices) to the specified survey.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    if (!surveyId) {
      return NextResponse.json({ detail: 'Survey ID is required.' }, { status: 400 });
    }

    const jsonBody = await request.json();

    const res = await djangoFetch(DJANGO_ENDPOINTS.SURVEYS.QUESTIONS(surveyId), {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(jsonBody),
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to add question.' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
