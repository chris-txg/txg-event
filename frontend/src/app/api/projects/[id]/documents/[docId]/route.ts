import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    if (!id || !docId) {
      return NextResponse.json(
        { detail: 'Project ID and Document ID are required.' },
        { status: 400 }
      );
    }

    const res = await djangoFetch(`/api/projects/${id}/documents/${docId}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });

    const payload = res.ok
      ? (res.data ?? { message: 'Document deleted successfully.' })
      : (res.error ?? { detail: 'Failed to delete document.' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
