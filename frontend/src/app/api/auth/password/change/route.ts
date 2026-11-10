import { NextRequest, NextResponse } from 'next/server';
import { changePasswordSchema } from '@/features/authentication/schemas/password.schema';
import { djangoFetch } from '@/lib/api/django-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const res = await djangoFetch('/api/auth/password/change/', {
      method: 'POST',
      body: JSON.stringify(validation.data),
      requiresAuth: true,
    });

    if (!res.ok) {
      return NextResponse.json(res.error || { detail: 'Password change failed' }, {
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
