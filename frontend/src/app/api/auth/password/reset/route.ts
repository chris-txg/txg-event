import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/features/authentication/schemas/password.schema';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const res = await fetch(`${DJANGO_API_URL}/api/auth/password/reset/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(validation.data),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    return NextResponse.json(
      typeof data === 'string' ? { detail: data } : data,
      { status: res.status }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
