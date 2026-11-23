import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';

/**
 * GET /api/projects/[id]/surveys
 * Proxies request to Django GET /api/projects/<id>/surveys/ (EventProjectSurveysListView)
 * Scoped strictly to the specified EventProject owned by the user.
 * Preserves StandardResultsSetPagination parameters (page, page_size).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ detail: 'Project ID is required.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const forwardParams = new URLSearchParams();

    const allowed = ['page', 'page_size'];
    for (const key of allowed) {
      const value = searchParams.get(key);
      if (value) {
        forwardParams.set(key, value);
      }
    }

    const queryString = forwardParams.toString();
    const endpoint = `/api/projects/${id}/surveys/${queryString ? `?${queryString}` : ''}`;

    const res = await djangoFetch(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to fetch project surveys' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
