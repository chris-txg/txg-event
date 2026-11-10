import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/auth/cookies';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const res = await fetch(`${DJANGO_API_URL}/api/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      return NextResponse.json(
        typeof data === 'string' ? { detail: data } : data,
        { status: res.status }
      );
    }

    const { user, tokens } = data;

    if (!tokens?.access || !tokens?.refresh) {
      return NextResponse.json(
        { detail: 'Registration succeeded but tokens were not returned by server' },
        { status: 502 }
      );
    }

    const response = NextResponse.json(
      {
        user,
        message: 'Account created successfully',
      },
      { status: 201 }
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
