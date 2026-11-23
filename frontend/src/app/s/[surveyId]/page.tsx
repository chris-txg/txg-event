import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { RespondentSurveyContainer } from '@/features/surveys/components/respondent/RespondentSurveyContainer';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Survey Participation — Event Manager',
  description: 'Participate in and submit responses for Event Manager surveys.',
};

async function SurveyContent({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  return <RespondentSurveyContainer surveyId={surveyId} />;
}

export default function RespondentPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-stone-500">Loading survey...</p>
        </div>
      }
    >
      <SurveyContent params={params} />
    </Suspense>
  );
}
