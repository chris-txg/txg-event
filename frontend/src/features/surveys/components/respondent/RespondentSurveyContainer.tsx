'use client';

import React, { useState } from 'react';
import { useAuth } from '@/features/authentication/context/AuthContext';
import {
  usePublicSurvey,
  useSubmitPublicSurvey,
  SurveyApiError,
} from '@/features/surveys/hooks/useSurveys';
import {
  SurveySubmitPayload,
  SurveySubmitSuccessResponse,
} from '@/features/surveys/types/survey.types';
import { RespondentSurveyForm } from './RespondentSurveyForm';
import { RespondentAuthRequiredCard } from './RespondentAuthRequiredCard';
import { RespondentClosedCard } from './RespondentClosedCard';
import { RespondentSuccessCard } from './RespondentSuccessCard';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { RotateCcw } from 'lucide-react';

export interface RespondentSurveyContainerProps {
  surveyId: string;
}

export function RespondentSurveyContainer({ surveyId }: RespondentSurveyContainerProps) {
  const cleanSurveyId = typeof surveyId === 'string' ? surveyId.trim() : '';
  const loginUrl = `/login?redirect=${encodeURIComponent('/s/' + cleanSurveyId)}`;

  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const {
    data: survey,
    isLoading: isSurveyLoading,
    isError,
    error: surveyError,
    refetch,
  } = usePublicSurvey(cleanSurveyId, isAuthenticated);

  const submitMutation = useSubmitPublicSurvey(cleanSurveyId);

  const [submissionResult, setSubmissionResult] = useState<SurveySubmitSuccessResponse | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // 1. Initial Loading State (wait for auth and survey query)
  if (isAuthLoading || isSurveyLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-stone-500">Loading survey...</p>
      </div>
    );
  }

  // 2. Post-Submission Success View (Unmounts form completely)
  if (submissionResult) {
    return (
      <div className="py-6 sm:py-10 animate-fadeIn">
        <RespondentSuccessCard
          message={submissionResult.message}
          responseId={submissionResult.response_id}
          submittedAt={submissionResult.submitted_at}
        />
      </div>
    );
  }

  // 3. Survey Retrieval Error States
  if (isError && surveyError) {
    // 403 Forbidden: Private survey requires login
    if (surveyError.status === 403) {
      return (
        <div className="py-8 sm:py-12 animate-fadeIn">
          <RespondentAuthRequiredCard
            message="This is a private survey. Please sign in to participate."
            loginUrl={loginUrl}
          />
        </div>
      );
    }

    // 404 Not Found: Survey does not exist or invalid ID
    if (surveyError.status === 404) {
      return (
        <div className="py-12 max-w-lg mx-auto text-left animate-fadeIn">
          <Alert variant="error" title="Survey Not Found">
            The requested survey could not be found. The link may be incorrect, expired, or the survey may have been removed.
          </Alert>
        </div>
      );
    }

    // 400 Bad Request: Inactive/Closed survey from backend
    if (surveyError.status === 400) {
      // Backend contract (PublicSurveyRetrieveView#L489):
      // {"detail": "This survey is not currently active (Status: <status>)."}
      const detail =
        typeof surveyError.originalError === 'object' && surveyError.originalError !== null
          ? (surveyError.originalError as Record<string, unknown>).detail
          : surveyError.message;

      const isInactiveContract =
        typeof detail === 'string' &&
        detail.trim().startsWith('This survey is not currently active (Status:');

      if (isInactiveContract) {
        return (
          <div className="py-8 sm:py-12 animate-fadeIn">
            <RespondentClosedCard
              title="Survey Inactive"
              message={detail}
            />
          </div>
        );
      }
    }

    // Other errors (Network offline or 500)
    return (
      <div className="py-12 max-w-lg mx-auto space-y-4 text-left animate-fadeIn">
        <Alert variant="error" title="Unable to Load Survey">
          <p>{surveyError.message || 'A network error occurred while loading this survey.'}</p>
        </Alert>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Retry Fetching</span>
        </button>
      </div>
    );
  }

  // 4. Survey Loaded: Evaluate Eligibility and Access Gates
  if (survey) {
    // Gate A: Private survey logged-out gate
    if (survey.visibility === 'private' && !isAuthenticated) {
      return (
        <div className="py-8 sm:py-12 animate-fadeIn">
          <RespondentAuthRequiredCard
            message="This is a private survey. Please sign in to participate."
            loginUrl={loginUrl}
          />
        </div>
      );
    }

    // Gate B: allow_anonymous=false logged-out gate (Do NOT expose questions)
    if (!survey.allow_anonymous && !isAuthenticated) {
      return (
        <div className="py-8 sm:py-12 animate-fadeIn">
          <RespondentAuthRequiredCard
            message="The organizer of this survey requires respondents to sign in before participating."
            loginUrl={loginUrl}
          />
        </div>
      );
    }

    // Gate C: Inactive or Closed survey gate
    if (!survey.is_active) {
      return (
        <div className="py-8 sm:py-12 animate-fadeIn">
          <RespondentClosedCard
            title={`Survey ${survey.status === 'closed' ? 'Closed' : 'Inactive'}`}
            message="This survey is not currently accepting responses."
          />
        </div>
      );
    }

    // Gate D: Empty questionnaire guard
    if (!survey.questions || survey.questions.length === 0) {
      return (
        <div className="py-8 sm:py-12 animate-fadeIn">
          <RespondentClosedCard
            title="No Questions Available"
            message="This survey does not have any active questions to answer at this time."
          />
        </div>
      );
    }

    // 5. Active Respondent Form
    const handleFormSubmit = async (payload: SurveySubmitPayload) => {
      setSubmissionError(null);
      try {
        const result = await submitMutation.mutateAsync(payload);
        setSubmissionResult(result);
      } catch (err: unknown) {
        if (err instanceof SurveyApiError) {
          if (err.status === 400) {
            const msg = err.message.toLowerCase();
            if (msg.includes('already submitted')) {
              setSubmissionError('Duplicate Submission: You have already submitted a response to this survey.');
              return;
            }
          }
          setSubmissionError(err.message);
        } else if (err instanceof Error) {
          setSubmissionError(
            'Network error encountered while submitting. Please check your connection and verify whether your responses were recorded before resubmitting.'
          );
        } else {
          setSubmissionError('An unexpected error occurred while submitting your responses.');
        }
      }
    };

    return (
      <RespondentSurveyForm
        survey={survey}
        onSubmit={handleFormSubmit}
        isSubmitting={submitMutation.isPending}
        submitError={submissionError}
      />
    );
  }

  return null;
}
