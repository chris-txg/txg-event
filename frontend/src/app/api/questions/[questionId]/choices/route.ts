import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';

/**
 * POST /api/questions/[questionId]/choices
 * Proxies request to Django POST /api/questions/<id>/choices/
 * Adds a new choice option to an existing single or multiple choice question.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    if (!questionId) {
      return NextResponse.json({ detail: 'Question ID is required.' }, { status: 400 });
    }

    const jsonBody = await request.json();

    const res = await djangoFetch(`/api/questions/${questionId}/choices/`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(jsonBody),
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to add choice.' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
