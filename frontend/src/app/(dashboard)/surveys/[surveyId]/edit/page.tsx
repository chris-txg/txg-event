'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
} from 'lucide-react';
import { useSurvey, useUpdateSurvey } from '@/features/surveys/hooks/useSurveys';
import { SurveyForm } from '@/features/surveys/components/SurveyForm';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

function EditSurveyContent() {
  const params = useParams();
  const surveyId = params?.surveyId as string;
  const router = useRouter();

  const {
    data: survey,
    isLoading,
    isError,
    error,
    refetch,
  } = useSurvey(surveyId);

  const updateSurveyMutation = useUpdateSurvey();

  const handleUpdateSurvey = async (payload: {
    project: string;
    title: string;
    description?: string;
    visibility: 'public' | 'private';
    allow_anonymous: boolean;
    duplicate_rule: 'allow_multiple' | 'one_per_user' | 'one_per_ip';
    start_date?: string | null;
    end_date?: string | null;
  }) => {
    await updateSurveyMutation.mutateAsync({
      surveyId,
      payload: {
        title: payload.title,
        description: payload.description,
        visibility: payload.visibility,
        allow_anonymous: payload.allow_anonymous,
        duplicate_rule: payload.duplicate_rule,
        start_date: payload.start_date,
        end_date: payload.end_date,
      },
    });

    router.push(`/surveys/${surveyId}`);
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-stone-500 mt-3">Loading survey for editing...</p>
      </div>
    );
  }

  if (isError || !survey) {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-12 text-left">
        <Alert variant="error" title="Survey Not Found">
          <p>{error instanceof Error ? error.message : 'Could not load survey data for editing.'}</p>
        </Alert>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Retry Fetch
          </button>
          <Link
            href="/surveys"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#762D46] text-white font-semibold text-xs hover:bg-[#5C2337] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Surveys</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9DDE1]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#30232A]">
            Edit Survey Metadata
          </h1>
          <p className="text-xs sm:text-sm text-[#75666D] mt-1">
            Update title, instructions, scheduling, and respondent eligibility rules.
          </p>
        </div>

        <Link
          href={`/surveys/${survey.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel & Return</span>
        </Link>
      </div>

      {/* Form Card */}
      <SurveyForm
        mode="edit"
        initialData={survey}
        onSubmit={handleUpdateSurvey}
        isSubmitting={updateSurveyMutation.isPending}
      />
    </div>
  );
}

export default function EditSurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-stone-500 mt-3">Loading survey editor...</p>
        </div>
      }
    >
      <EditSurveyContent />
    </Suspense>
  );
}
