import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/api/django-client';
import { DJANGO_ENDPOINTS } from '@/config/endpoints';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/surveys/[surveyId]/payment/verify
 * Proxies payment verification to Django:
 * POST /api/surveys/<id>/payment/verify/
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ surveyId?: string; id?: string }> | { surveyId?: string; id?: string } }
) {
  try {
    const resolvedParams = context?.params ? await Promise.resolve(context.params) : null;
    let cleanId = (resolvedParams?.surveyId || (resolvedParams as Record<string, string>)?.id || '').trim();

    // Fallback: extract surveyId from URL pathname if params did not resolve it
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { detail: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { detail: 'Invalid request body.' },
        { status: 400 }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body as Record<string, unknown>;

    if (
      typeof razorpay_order_id !== 'string' ||
      !razorpay_order_id.trim() ||
      typeof razorpay_payment_id !== 'string' ||
      !razorpay_payment_id.trim() ||
      typeof razorpay_signature !== 'string' ||
      !razorpay_signature.trim()
    ) {
      return NextResponse.json(
        { detail: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required string fields.' },
        { status: 400 }
      );
    }

    const res = await djangoFetch(DJANGO_ENDPOINTS.SURVEYS.PAYMENT_VERIFY(cleanId), {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({
        razorpay_order_id: razorpay_order_id.trim(),
        razorpay_payment_id: razorpay_payment_id.trim(),
        razorpay_signature: razorpay_signature.trim(),
      }),
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = res.ok
      ? res.data
      : (res.error ?? { detail: 'Payment verification failed.' });

    return NextResponse.json(payload, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
