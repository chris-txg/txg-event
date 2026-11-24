'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useDeleteQuestion, SurveyApiError } from '@/features/surveys/hooks/useSurveys';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface DeleteQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  question: {
    id: string;
    text: string;
    order?: number;
  } | null;
  onSuccess?: () => void;
}

export function DeleteQuestionModal({
  isOpen,
  onClose,
  surveyId,
  question,
  onSuccess,
}: DeleteQuestionModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deleteMutation = useDeleteQuestion(surveyId);

  if (!isOpen || !question) return null;

  const handleDelete = async () => {
    setErrorMessage(null);

    try {
      await deleteMutation.mutateAsync({
        questionId: question.id,
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
        setErrorMessage('Failed to delete question. Please try again.');
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
      aria-labelledby="delete-question-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative text-left my-auto max-h-[95vh] overflow-y-auto">
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
            <h3 id="delete-question-modal-title" className="text-base font-bold text-[#30232A]">
              Delete Question
            </h3>
            <p className="text-xs text-stone-500">This action will remove the question and all associated choices.</p>
          </div>
        </div>

        <p className="text-sm text-stone-600 mb-4 leading-relaxed">
          Are you sure you want to delete{' '}
          <strong className="text-[#30232A] font-semibold">&ldquo;{question.text}&rdquo;</strong>?
        </p>

        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 mb-4 text-xs text-amber-900 leading-relaxed">
          <strong>Note:</strong> If participant responses have already been recorded for this survey, the backend will prevent deletion to preserve data integrity.
        </div>

        {errorMessage && (
          <div className="mb-4">
            <Alert variant="error" title="Cannot Delete Question">
              <p>{errorMessage}</p>
            </Alert>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleModalClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Question</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
