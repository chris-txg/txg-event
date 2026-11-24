import { NextRequest, NextResponse } from 'next/server';
import { DJANGO_BASE_URL, DJANGO_ENDPOINTS } from '@/config/endpoints';
import { cookies } from 'next/headers';
import { COOKIE_NAMES } from '@/lib/auth/cookies';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/surveys/[surveyId]/report/download
 * Proxies binary PDF download from Django backend:
 * GET /api/surveys/<id>/report/download/
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

    const djangoUrl = `${DJANGO_BASE_URL}${DJANGO_ENDPOINTS.SURVEYS.REPORT_DOWNLOAD(cleanId)}`;
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
        { detail: errText || 'Failed to download report PDF from backend.' },
        { status: res.status }
      );
    }

    const pdfBuffer = await res.arrayBuffer();
    const contentDisposition = res.headers.get('content-disposition') || `attachment; filename="Survey_Report.pdf"`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
