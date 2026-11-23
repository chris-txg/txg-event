import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `${DJANGO_ENDPOINTS.PROJECTS.LIST_CREATE}?${queryString}`
      : DJANGO_ENDPOINTS.PROJECTS.LIST_CREATE;

    const res = await djangoFetch(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });

    const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to fetch projects' });
    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      const res = await djangoFetch(DJANGO_ENDPOINTS.PROJECTS.LIST_CREATE, {
        method: 'POST',
        requiresAuth: true,
        body: formData,
      });

      const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to create project' });
      return NextResponse.json(payload, { status: res.status });
    } else {
      const jsonBody = await request.json();

      const res = await djangoFetch(DJANGO_ENDPOINTS.PROJECTS.LIST_CREATE, {
        method: 'POST',
        requiresAuth: true,
        body: JSON.stringify(jsonBody),
      });

      const payload = res.ok ? res.data : (res.error ?? { detail: 'Failed to create project' });
      return NextResponse.json(payload, { status: res.status });
    }
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
