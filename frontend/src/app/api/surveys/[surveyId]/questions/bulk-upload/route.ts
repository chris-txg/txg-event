import { NextRequest, NextResponse } from 'next/server';
import { DJANGO_BASE_URL, DJANGO_ENDPOINTS } from '@/config/endpoints';
import { cookies } from 'next/headers';
import { COOKIE_NAMES } from '@/lib/auth/cookies';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/surveys/[surveyId]/questions/bulk-upload
 * Proxies Excel file multipart upload to Django backend
 */
export async function POST(
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

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dry_run');
    const queryString = dryRun ? `dry_run=${encodeURIComponent(dryRun)}` : '';

    const djangoUrl = `${DJANGO_BASE_URL}${DJANGO_ENDPOINTS.SURVEYS.QUESTIONS_BULK_UPLOAD(cleanId, queryString)}`;
    const formData = await request.formData();

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(djangoUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
