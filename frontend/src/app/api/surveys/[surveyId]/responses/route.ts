import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/surveys/[surveyId]/responses
 * Proxies paginated recorded survey submissions to Django:
 * GET /api/surveys/<id>/responses/?page=<p>&page_size=<s>
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

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = DJANGO_ENDPOINTS.SURVEYS.RESPONSES(cleanId, queryString);

    const res = await djangoFetch(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = res.ok
      ? res.data
      : (res.error ?? { detail: 'Failed to fetch survey responses.' });

    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
