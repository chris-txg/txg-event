'use client';

import React, { useState } from 'react';
import { AlertTriangle, Lock, X } from 'lucide-react';
import { useCloseSurvey, SurveyApiError } from '@/features/surveys/hooks/useSurveys';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { SurveyDetail } from '@/features/surveys/types/survey.types';

export interface CloseSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: SurveyDetail;
  onSuccess?: () => void;
}

export function CloseSurveyModal({
  isOpen,
  onClose,
  survey,
  onSuccess,
}: CloseSurveyModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const closeMutation = useCloseSurvey();

  if (!isOpen) return null;

  const handleCloseSurvey = async () => {
    setErrorMessage(null);

    try {
      await closeMutation.mutateAsync({
        surveyId: survey.id,
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof SurveyApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to close survey. Please try again.');
      }
    }
  };

  const handleModalClose = () => {
    if (closeMutation.isPending) return;
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-survey-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative text-left my-auto max-h-[95vh] overflow-y-auto">
        <button
          onClick={handleModalClose}
          disabled={closeMutation.isPending}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 id="close-survey-modal-title" className="text-base font-bold text-[#30232A]">
              Close Survey
            </h3>
            <p className="text-xs text-stone-500">Stop accepting participant responses</p>
          </div>
        </div>

        <p className="text-sm text-stone-600 mb-4 leading-relaxed">
          Are you sure you want to close{' '}
          <strong className="text-[#30232A] font-semibold">&ldquo;{survey.title}&rdquo;</strong>?
        </p>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 mb-4 space-y-2 text-xs text-stone-700 leading-relaxed">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Submissions will stop immediately.</strong> Respondents opening the link will see
              a notification that the survey is closed.
            </div>
          </div>
          <div className="text-stone-500 pl-6">
            All existing responses ({survey.response_count}) remain completely safe and accessible in
            analytics.
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4">
            <Alert variant="error" title="Error Closing Survey">
              <p>{errorMessage}</p>
            </Alert>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
          <Button
            variant="ghost"
            onClick={handleModalClose}
            disabled={closeMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={handleCloseSurvey}
            isLoading={closeMutation.isPending}
            disabled={closeMutation.isPending}
          >
            <Lock className="w-4 h-4 mr-1.5" />
            <span>Confirm & Close Survey</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
