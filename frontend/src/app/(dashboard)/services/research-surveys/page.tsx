'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const surveyId = searchParams.get('surveyId');
    if (surveyId) {
      router.replace(`/analytics?surveyId=${encodeURIComponent(surveyId)}`);
    } else {
      router.replace('/analytics');
    }
  }, [router, searchParams]);

  return (
    <div className="py-24 flex flex-col items-center justify-center">
      <Spinner size="lg" />
      <p className="text-xs font-medium text-stone-500 mt-3">
        Redirecting to Analytics...
      </p>
    </div>
  );
}

export default function ResearchSurveysRedirect() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
