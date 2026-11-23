import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

/**
 * PATCH /api/questions/[questionId]
 * Proxies partial update to Django PATCH /api/questions/<id>/
 * Writable fields: text, is_required, order.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    if (!questionId) {
      return NextResponse.json({ detail: 'Question ID is required.' }, { status: 400 });
    }

    const jsonBody = await request.json();

    const res = await djangoFetch(DJANGO_ENDPOINTS.QUESTIONS.DETAIL(questionId), {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify(jsonBody),
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to update question.' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/questions/[questionId]
 * Proxies question deletion to Django DELETE /api/questions/<id>/
 * Cascades to choices. Rejected if survey already has recorded responses.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    if (!questionId) {
      return NextResponse.json({ detail: 'Question ID is required.' }, { status: 400 });
    }

    const res = await djangoFetch(DJANGO_ENDPOINTS.QUESTIONS.DETAIL(questionId), {
      method: 'DELETE',
      requiresAuth: true,
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = res.ok
      ? (res.data ?? { message: 'Question deleted successfully.' })
      : (res.error ?? { detail: 'Failed to delete question.' });

    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
