import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';

export async function GET() {
  const res = await djangoFetch('/api/auth/profile/customer/', {
    method: 'GET',
    requiresAuth: true,
  });

  if (!res.ok) {
    return NextResponse.json(res.error || { detail: 'Failed to fetch customer profile' }, {
      status: res.status,
    });
  }

  return NextResponse.json(res.data, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await djangoFetch('/api/auth/profile/customer/', {
      method: 'PATCH',
      body: JSON.stringify(body),
      requiresAuth: true,
    });

    if (!res.ok) {
      return NextResponse.json(res.error || { detail: 'Failed to update customer profile' }, {
        status: res.status,
      });
    }

    return NextResponse.json(res.data, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
