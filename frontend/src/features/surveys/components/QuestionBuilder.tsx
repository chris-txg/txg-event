'use client';

import React, { useState } from 'react';
import {
  ListOrdered,
  Plus,
  HelpCircle,
  Lock,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { SurveyDetail, Question } from '@/features/surveys/types/survey.types';
import { useSwapQuestions, surveyKeys } from '@/features/surveys/hooks/useSurveys';
import { useQueryClient } from '@tanstack/react-query';
import { QuestionCard } from '@/features/surveys/components/QuestionCard';
import { QuestionModal } from '@/features/surveys/components/QuestionModal';
import { DeleteQuestionModal } from '@/features/surveys/components/DeleteQuestionModal';
import { BulkQuestionUploadModal } from '@/features/surveys/components/BulkQuestionUploadModal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface QuestionBuilderProps {
  survey: SurveyDetail;
}

export function QuestionBuilder({ survey }: QuestionBuilderProps) {
  const hasResponses = survey.response_count > 0;
  const questions = survey.questions || [];

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);

  const queryClient = useQueryClient();

  // Reorder loading state
  const [reorderingQuestionId, setReorderingQuestionId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const swapQuestionsMutation = useSwapQuestions(survey.id);
  const isReordering = swapQuestionsMutation.isPending || reorderingQuestionId !== null;

  // Stable sort matching Django's Question.Meta ordering = ["order", "created_at"]
  const sortedQuestions = [...questions].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Handle reorder swaps via safe three-step mutation
  const handleSwapOrder = async (indexA: number, indexB: number) => {
    if (isReordering) return;
    if (
      indexA < 0 ||
      indexA >= sortedQuestions.length ||
      indexB < 0 ||
      indexB >= sortedQuestions.length
    ) {
      return;
    }

    const questionA = sortedQuestions[indexA];
    const questionB = sortedQuestions[indexB];
    if (!questionA || !questionB) return;

    setReorderError(null);
    setReorderingQuestionId(questionA.id);

    try {
      await swapQuestionsMutation.mutateAsync({
        questionA,
        questionB,
        indexA,
        indexB,
        allQuestions: sortedQuestions,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Question reordering failed. Persisted server order has been synchronized.';
      setReorderError(message);
    } finally {
      setReorderingQuestionId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F8EFF2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center">
            <ListOrdered className="w-5 h-5 text-[#A84A63]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#30232A]">Survey Questions</h2>
            <p className="text-xs text-[#75666D]">
              {sortedQuestions.length} {sortedQuestions.length === 1 ? 'question' : 'questions'} authored for this survey.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {hasResponses ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Questions Locked (Responses Recorded)</span>
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsBulkUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#542037] bg-white hover:bg-[#FAF6F7] border border-[#E9DDE1] rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#762D46]" />
                <span>Import from Excel</span>
              </button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Structural Lock Notification Banner */}
      {hasResponses && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Survey questionnaire is locked (Responses recorded)</p>
            <p className="text-amber-800">
              Because participant responses have already been recorded, question wording, required status, questionnaire structure, and response choices are permanently locked. Question display reordering remains available.
            </p>
          </div>
        </div>
      )}

      {/* Reorder Error Banner */}
      {reorderError && (
        <Alert variant="error" title="Reordering Failed">
          <p>{reorderError}</p>
        </Alert>
      )}

      {/* Questions List */}
      {sortedQuestions.length > 0 ? (
        <div className="space-y-4">
          {sortedQuestions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              totalQuestions={sortedQuestions.length}
              surveyId={survey.id}
              responseCount={survey.response_count}
              onMoveUp={() => handleSwapOrder(index, index - 1)}
              onMoveDown={() => handleSwapOrder(index, index + 1)}
              onEdit={() => setEditingQuestion(question)}
              onDelete={() => setDeletingQuestion(question)}
              isReordering={isReordering}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-12 text-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-xl bg-[#F4E5EA] text-[#762D46] mx-auto flex items-center justify-center mb-3">
            <HelpCircle className="w-6 h-6 text-[#A84A63]" />
          </div>
          <h4 className="text-sm font-bold text-[#30232A] mb-1">No Questions Added Yet</h4>
          <p className="text-xs text-[#75666D] leading-relaxed mb-4">
            Build your survey questionnaire by adding questions with text prompts, rating scales, single/multiple choices, or date pickers.
          </p>
          {!hasResponses && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span>Add First Question</span>
            </Button>
          )}
        </div>
      )}

      {/* Add Question Modal */}
      <QuestionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        surveyId={survey.id}
        defaultOrder={sortedQuestions.length}
        responseCount={survey.response_count}
      />

      {/* Edit Question Modal */}
      <QuestionModal
        isOpen={Boolean(editingQuestion)}
        onClose={() => setEditingQuestion(null)}
        surveyId={survey.id}
        question={editingQuestion}
        responseCount={survey.response_count}
      />

      {/* Delete Question Modal */}
      <DeleteQuestionModal
        isOpen={Boolean(deletingQuestion)}
        onClose={() => setDeletingQuestion(null)}
        surveyId={survey.id}
        question={deletingQuestion}
      />

      {/* Bulk Excel Upload Modal */}
      <BulkQuestionUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        surveyId={survey.id}
        surveyTitle={survey.title}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: surveyKeys.detail(survey.id) });
        }}
      />
    </div>
  );
}
