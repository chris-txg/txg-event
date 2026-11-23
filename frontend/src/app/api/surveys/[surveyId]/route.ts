import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';

/**
 * GET /api/surveys/[surveyId]
 * Proxies request to Django GET /api/surveys/<id>/
 * - Preserves backend permissions: allows public viewing if published and public;
 *   attaches creator/staff bearer token for draft or private survey inspection.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    if (!surveyId) {
      return NextResponse.json({ detail: 'Survey ID is required.' }, { status: 400 });
    }

    const res = await djangoFetch(`/api/surveys/${surveyId}/`, {
      method: 'GET',
      requiresAuth: true,
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to fetch survey details' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/surveys/[surveyId]
 * Proxies partial metadata updates to Django PATCH /api/surveys/<id>/
 * Requires authentication and creator/staff ownership.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    if (!surveyId) {
      return NextResponse.json({ detail: 'Survey ID is required.' }, { status: 400 });
    }

    const jsonBody = await request.json();

    const res = await djangoFetch(`/api/surveys/${surveyId}/`, {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify(jsonBody),
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to update survey' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/surveys/[surveyId]
 * Proxies deletion to Django DELETE /api/surveys/<id>/
 * Preserves backend error responses (e.g. 400 Bad Request if responses already exist).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    if (!surveyId) {
      return NextResponse.json({ detail: 'Survey ID is required.' }, { status: 400 });
    }

    const res = await djangoFetch(`/api/surveys/${surveyId}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = res.ok
      ? (res.data ?? { message: 'Survey deleted successfully.' })
      : (res.error ?? { detail: 'Failed to delete survey.' });

    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
