'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useDeleteSurvey, SurveyApiError } from '@/features/surveys/hooks/useSurveys';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface DeleteSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: {
    id: string;
    title: string;
    project?: string;
  } | null;
  onSuccess?: () => void;
}

export function DeleteSurveyModal({
  isOpen,
  onClose,
  survey,
  onSuccess,
}: DeleteSurveyModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deleteMutation = useDeleteSurvey();

  if (!isOpen || !survey) return null;

  const handleDelete = async () => {
    setErrorMessage(null);

    try {
      await deleteMutation.mutateAsync({
        surveyId: survey.id,
        projectId: survey.project,
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
        setErrorMessage('Failed to delete survey. Please try again.');
      }
    }
  };

  const handleModalClose = () => {
    if (deleteMutation.isPending) return;
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-survey-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative text-left">
        <button
          onClick={handleModalClose}
          disabled={deleteMutation.isPending}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="delete-survey-modal-title" className="text-base font-bold text-[#30232A]">
              Delete Survey
            </h3>
            <p className="text-xs text-stone-500">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-stone-600 mb-4 leading-relaxed">
          Are you sure you want to permanently delete{' '}
          <strong className="text-[#30232A] font-semibold">&ldquo;{survey.title}&rdquo;</strong>?
        </p>

        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 mb-4 text-xs text-amber-900 leading-relaxed">
          <strong>Note:</strong> Surveys that have already recorded participant responses cannot be
          deleted to maintain compliance and audit integrity.
        </div>

        {errorMessage && (
          <Alert variant="error" className="mb-4">
            {errorMessage}
          </Alert>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleModalClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={deleteMutation.isPending}
            onClick={handleDelete}
            className="cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Deletion</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
