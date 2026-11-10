import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { User } from '@/features/authentication/types/auth.types';

export async function GET() {
  const res = await djangoFetch<User>('/api/auth/me/', {
    method: 'GET',
    requiresAuth: true,
  });

  if (!res.ok || !res.data) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: res.data }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await djangoFetch<User>('/api/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(body),
      requiresAuth: true,
    });

    if (!res.ok) {
      return NextResponse.json(res.error || { detail: 'Update failed' }, {
        status: res.status,
      });
    }

    return NextResponse.json({ user: res.data }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
