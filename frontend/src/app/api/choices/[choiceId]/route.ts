import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';

/**
 * DELETE /api/choices/[choiceId]
 * Proxies choice deletion to Django DELETE /api/choices/<id>/
 * Rejected if survey already has recorded responses.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ choiceId: string }> }
) {
  try {
    const { choiceId } = await params;
    if (!choiceId) {
      return NextResponse.json({ detail: 'Choice ID is required.' }, { status: 400 });
    }

    const res = await djangoFetch(`/api/choices/${choiceId}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = res.ok
      ? (res.data ?? { message: 'Choice deleted successfully.' })
      : (res.error ?? { detail: 'Failed to delete choice.' });

    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
