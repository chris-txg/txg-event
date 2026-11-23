'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Lock } from 'lucide-react';
import {
  useAddQuestion,
  useUpdateQuestion,
  useAddChoice,
  useDeleteChoice,
  surveyKeys,
  SurveyApiError,
} from '@/features/surveys/hooks/useSurveys';
import { surveyClientService } from '@/features/surveys/services/surveyClientService';
import {
  Question,
  QuestionType,
  QuestionChoice,
  CreateQuestionPayload,
} from '@/features/surveys/types/survey.types';
import { createQuestionSchema, updateQuestionSchema } from '@/features/surveys/schemas/survey.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';

export interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  question?: Question | null;
  defaultOrder?: number;
  responseCount?: number;
  onSuccess?: () => void;
}

const QUESTION_TYPE_OPTIONS = [
  { value: 'text', label: 'Short / Long Text' },
  { value: 'number', label: 'Number / Rating' },
  { value: 'single', label: 'Single Choice (Radio)' },
  { value: 'multiple', label: 'Multiple Choice (Checkboxes)' },
  { value: 'boolean', label: 'Yes / No (Boolean)' },
  { value: 'date', label: 'Date Selection' },
] as const;

interface QuestionModalContentProps {
  onClose: () => void;
  surveyId: string;
  question?: Question | null;
  defaultOrder: number;
  responseCount: number;
  onSuccess?: () => void;
}

function QuestionModalContent({
  onClose,
  surveyId,
  question,
  defaultOrder,
  responseCount,
  onSuccess,
}: QuestionModalContentProps) {
  const isEdit = Boolean(question);
  const hasResponses = responseCount > 0;

  // Form states initialized directly
  const [text, setText] = useState(question?.text ?? '');
  const [questionType, setQuestionType] = useState<QuestionType>(question?.question_type ?? 'text');
  const [isRequired, setIsRequired] = useState(question?.is_required ?? true);

  // Choices state for create mode
  const [createChoices, setCreateChoices] = useState<string[]>(['', '']);

  // Choices state for edit mode
  const [existingChoices, setExistingChoices] = useState<QuestionChoice[]>(question?.choices ?? []);
  const [newChoiceText, setNewChoiceText] = useState('');
  const [deletingChoiceId, setDeletingChoiceId] = useState<string | null>(null);
  const [isAddingChoice, setIsAddingChoice] = useState(false);

  // Validation & Error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Mutations & Query Client
  const queryClient = useQueryClient();
  const addQuestionMutation = useAddQuestion(surveyId);
  const updateQuestionMutation = useUpdateQuestion(surveyId);
  const addChoiceMutation = useAddChoice(surveyId);
  const deleteChoiceMutation = useDeleteChoice(surveyId);

  // Reconciles local choices with the persisted database state on mutation failures
  const syncChoicesWithServer = async () => {
    if (!question?.id) return;
    try {
      await queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      const freshRes = await surveyClientService.getSurveyById(surveyId);
      if (freshRes.ok && freshRes.data) {
        queryClient.setQueryData(surveyKeys.detail(surveyId), freshRes.data);
        const freshQuestion = freshRes.data.questions?.find((q) => q.id === question.id);
        if (freshQuestion && Array.isArray(freshQuestion.choices)) {
          setExistingChoices(freshQuestion.choices);
        }
      }
    } catch {
      // Retain preserved error in apiError
    }
  };

  const isChoiceType = ['single', 'multiple'].includes(questionType);

  // Handle choice array mutations in create mode
  const handleAddCreateChoice = () => {
    setCreateChoices((prev) => [...prev, '']);
  };

  const handleRemoveCreateChoice = (index: number) => {
    if (createChoices.length <= 2) return;
    setCreateChoices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateChoiceChange = (index: number, val: string) => {
    setCreateChoices((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  // Handle choice operations in edit mode
  const handleAddExistingChoice = async () => {
    if (!question || !newChoiceText.trim() || hasResponses) return;
    setApiError(null);
    setIsAddingChoice(true);

    try {
      const res = await addChoiceMutation.mutateAsync({
        questionId: question.id,
        payload: {
          text: newChoiceText.trim(),
          order: existingChoices.length,
        },
      });

      setExistingChoices((prev) => [...prev, res]);
      setNewChoiceText('');
    } catch (err) {
      const errMsg = err instanceof SurveyApiError ? err.message : 'Failed to add choice option.';
      setApiError(errMsg);
      await syncChoicesWithServer();
    } finally {
      setIsAddingChoice(false);
    }
  };

  const handleDeleteExistingChoice = async (choiceId: string) => {
    if (!question || hasResponses || existingChoices.length <= 2) return;
    setApiError(null);
    setDeletingChoiceId(choiceId);

    try {
      await deleteChoiceMutation.mutateAsync({ choiceId });
      setExistingChoices((prev) => prev.filter((c) => c.id !== choiceId));
    } catch (err) {
      const errMsg = err instanceof SurveyApiError ? err.message : 'Failed to delete choice option.';
      setApiError(errMsg);
      await syncChoicesWithServer();
    } finally {
      setDeletingChoiceId(null);
    }
  };

  // Submit main question form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setErrors({});

    if (hasResponses) {
      setApiError('Question modifications are locked because participant responses have already been recorded.');
      return;
    }

    if (!isEdit) {
      // Create Question validation
      const payload: CreateQuestionPayload = {
        text: text.trim(),
        question_type: questionType,
        is_required: isRequired,
        order: defaultOrder,
        ...(isChoiceType
          ? { choices: createChoices.map((c) => c.trim()).filter((c) => c.length > 0) }
          : {}),
      };

      const result = createQuestionSchema.safeParse(payload);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const path = issue.path[0]?.toString() || 'text';
          fieldErrors[path] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      try {
        await addQuestionMutation.mutateAsync(payload);
        onClose();
        if (onSuccess) onSuccess();
      } catch (err) {
        if (err instanceof SurveyApiError) {
          setApiError(err.message);
        } else {
          setApiError('Failed to create question. Please check inputs.');
        }
      }
    } else {
      // Update Question validation
      if (!question) return;

      const payload = {
        text: text.trim(),
        is_required: isRequired,
      };

      const result = updateQuestionSchema.safeParse(payload);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const path = issue.path[0]?.toString() || 'text';
          fieldErrors[path] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      try {
        await updateQuestionMutation.mutateAsync({
          questionId: question.id,
          payload,
        });
        onClose();
        if (onSuccess) onSuccess();
      } catch (err) {
        if (err instanceof SurveyApiError) {
          setApiError(err.message);
        } else {
          setApiError('Failed to update question.');
        }
      }
    }
  };

  const isSaving = addQuestionMutation.isPending || updateQuestionMutation.isPending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 relative text-left my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3 id="question-modal-title" className="text-lg font-bold text-[#30232A]">
              {isEdit ? 'Edit Question' : 'Add Survey Question'}
            </h3>
            <p className="text-xs text-stone-500">
              {isEdit
                ? 'Update question phrasing and validation options.'
                : 'Configure a new prompt and response format for participants.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 py-4 overflow-y-auto flex-1 pr-1">
          {hasResponses && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Question is permanently locked</p>
                <p className="text-amber-800">
                  Participant responses have already been recorded. Question text, required status, and choices cannot be edited or submitted.
                </p>
              </div>
            </div>
          )}

          {apiError && (
            <Alert variant="error" title="Submission Error">
              <p>{apiError}</p>
            </Alert>
          )}

          {/* Question Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80">
              Question Text <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. How satisfied are you with the event organization?"
              rows={3}
              disabled={hasResponses || isSaving}
              className={`w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#421827] placeholder:text-stone-400 transition-all focus:outline-none focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20 disabled:bg-stone-50 disabled:cursor-not-allowed ${
                errors.text ? 'border-rose-400 focus:border-rose-500 text-rose-900' : ''
              }`}
            />
            {errors.text && <p className="text-xs text-rose-600 font-medium">{errors.text}</p>}
          </div>

          {/* Question Type */}
          <div className="space-y-1.5">
            {isEdit ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80 mb-1">
                  Question Type
                </label>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700">
                  <Lock className="w-4 h-4 text-stone-400" />
                  <span className="font-semibold capitalize">
                    {QUESTION_TYPE_OPTIONS.find((o) => o.value === questionType)?.label || questionType}
                  </span>
                  <span className="text-stone-400 ml-auto text-[11px]">
                    Type cannot be changed after creation
                  </span>
                </div>
              </div>
            ) : (
              <Select
                label="Question Type *"
                options={QUESTION_TYPE_OPTIONS}
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                disabled={isSaving}
                error={errors.question_type}
              />
            )}
          </div>

          {/* Is Required Checkbox */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
            <input
              type="checkbox"
              id="is_required_field"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              disabled={hasResponses || isSaving}
              className="w-4 h-4 rounded text-[#762D46] focus:ring-[#762D46] border-stone-300 accent-[#762D46] cursor-pointer disabled:cursor-not-allowed"
            />
            <label htmlFor="is_required_field" className="text-xs font-semibold text-[#30232A] cursor-pointer select-none">
              Mandatory Response (Participants cannot skip this question)
            </label>
          </div>

          {/* Choice Management for Single / Multiple choice questions */}
          {isChoiceType && (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#421827]/80">
                    Response Choices <span className="text-rose-500">*</span>
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Provide at least 2 selectable response choices for participants.
                  </p>
                </div>
                {hasResponses && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>

              {errors.choices && (
                <p className="text-xs text-rose-600 font-medium">{errors.choices}</p>
              )}

              {/* CREATE MODE: Dynamic choice inputs */}
              {!isEdit && (
                <div className="space-y-2">
                  {createChoices.map((choice, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-stone-400 text-center shrink-0">
                        {index + 1}.
                      </span>
                      <Input
                        value={choice}
                        onChange={(e) => handleCreateChoiceChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        disabled={isSaving}
                        className="py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCreateChoice(index)}
                        disabled={createChoices.length <= 2 || isSaving}
                        className="p-2 text-stone-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-stone-400 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                        title={
                          createChoices.length <= 2
                            ? 'Single and multiple choice questions require at least 2 choices'
                            : 'Remove choice'
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCreateChoice}
                    disabled={isSaving}
                    className="mt-2 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Option</span>
                  </Button>
                </div>
              )}

              {/* EDIT MODE: Existing choices list + Add new choice */}
              {isEdit && (
                <div className="space-y-3">
                  {hasResponses && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                      Choices cannot be added or deleted because responses have already been recorded for this survey.
                    </div>
                  )}

                  <div className="space-y-2">
                    {existingChoices.map((choice, index) => (
                      <div
                        key={choice.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-medium text-[#30232A] truncate">
                            {choice.text}
                          </span>
                        </div>

                        {!hasResponses && (
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingChoice(choice.id)}
                            disabled={
                              existingChoices.length <= 2 ||
                              deletingChoiceId === choice.id ||
                              isSaving
                            }
                            className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30 rounded hover:bg-stone-200/50 transition-colors cursor-pointer shrink-0"
                            title={
                              existingChoices.length <= 2
                                ? 'Single and multiple choice questions require at least 2 choices'
                                : 'Delete choice'
                            }
                          >
                            {deletingChoiceId === choice.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {!hasResponses && (
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        value={newChoiceText}
                        onChange={(e) => setNewChoiceText(e.target.value)}
                        placeholder="Add another choice option..."
                        disabled={isAddingChoice || isSaving}
                        className="py-1.5 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddExistingChoice();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddExistingChoice}
                        disabled={!newChoiceText.trim() || isAddingChoice || isSaving}
                        isLoading={isAddingChoice}
                        className="text-xs shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              {hasResponses ? 'Close' : 'Cancel'}
            </Button>
            {hasResponses ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed select-none">
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                <span>Locked (Responses Exist)</span>
              </span>
            ) : (
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
              >
                {isEdit ? 'Save Changes' : 'Add Question'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function QuestionModal(props: QuestionModalProps) {
  if (!props.isOpen) return null;

  return (
    <QuestionModalContent
      key={props.question?.id ?? 'new-question'}
      onClose={props.onClose}
      surveyId={props.surveyId}
      question={props.question}
      defaultOrder={props.defaultOrder ?? 0}
      responseCount={props.responseCount ?? 0}
      onSuccess={props.onSuccess}
    />
  );
}
