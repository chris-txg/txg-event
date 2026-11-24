import { NextRequest, NextResponse } from 'next/server';
import { DJANGO_BASE_URL, DJANGO_ENDPOINTS } from '@/config/endpoints';
import { cookies } from 'next/headers';
import { COOKIE_NAMES } from '@/lib/auth/cookies';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/surveys/[surveyId]/questions/template
 * Streams the official Survey Questions Excel template (.xlsx) from Django
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ surveyId?: string; id?: string }> | { surveyId?: string; id?: string } }
) {
  try {
    const resolvedParams = context?.params ? await Promise.resolve(context.params) : null;
    let cleanId = (resolvedParams?.surveyId || (resolvedParams as Record<string, string>)?.id || '').trim();

    if (!cleanId && request?.url) {
      const match = request.url.match(/\/api\/surveys\/([^/]+)/);
      if (match) {
        cleanId = decodeURIComponent(match[1]).trim();
      }
    }

    if (!cleanId || !UUID_REGEX.test(cleanId)) {
      return NextResponse.json(
        { detail: 'A valid survey UUID is required.' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;

    const djangoUrl = `${DJANGO_BASE_URL}${DJANGO_ENDPOINTS.SURVEYS.QUESTIONS_TEMPLATE(cleanId)}`;
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(djangoUrl, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { detail: errText || 'Failed to download template.' },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Survey_Questions_Template.xlsx"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
