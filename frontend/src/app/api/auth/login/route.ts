import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/auth/cookies';
import { loginSchema } from '@/features/authentication/schemas/login.schema';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { identifier, password } = validation.data;

    const res = await fetch(`${DJANGO_API_URL}/api/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      return NextResponse.json(
        typeof data === 'string' ? { detail: data } : data,
        { status: res.status }
      );
    }

    // Expecting { user: {...}, tokens: { access: '...', refresh: '...' } }
    const { user, tokens } = data;

    if (!tokens?.access || !tokens?.refresh) {
      return NextResponse.json(
        { detail: 'Invalid token payload received from backend' },
        { status: 502 }
      );
    }

    const response = NextResponse.json(
      {
        user,
        message: 'Signed in successfully',
      },
      { status: 200 }
    );

    setAuthCookies(response, tokens);
    return response;
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
