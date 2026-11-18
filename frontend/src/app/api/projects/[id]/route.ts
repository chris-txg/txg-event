import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await djangoFetch(`/api/projects/${id}/`, {
      method: 'GET',
      requiresAuth: true,
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to fetch project' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      const res = await djangoFetch(`/api/projects/${id}/`, {
        method: 'PATCH',
        requiresAuth: true,
        body: formData,
      });

      const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to update project' });
      return NextResponse.json(payload, { status: res.status });
    } else {
      const jsonBody = await request.json();

      const res = await djangoFetch(`/api/projects/${id}/`, {
        method: 'PATCH',
        requiresAuth: true,
        body: JSON.stringify(jsonBody),
      });

      const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to update project' });
      return NextResponse.json(payload, { status: res.status });
    }
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
