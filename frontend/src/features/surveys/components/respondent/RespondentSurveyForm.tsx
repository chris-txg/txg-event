'use client';

import React, { useState } from 'react';
import {
  SurveyDetail,
  SurveySubmitPayload,
  AnswerSubmissionItem,
  AnswerValue,
} from '@/features/surveys/types/survey.types';
import { RespondentQuestionCard } from './RespondentQuestionCard';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Send, FileText } from 'lucide-react';

export interface RespondentSurveyFormProps {
  survey: SurveyDetail;
  onSubmit: (payload: SurveySubmitPayload) => Promise<void>;
  isSubmitting: boolean;
  submitError?: string | null;
}

/**
 * Validates a strict calendar date in YYYY-MM-DD format (not merely a regex match).
 * Catches invalid dates such as 2026-02-30 or 2026-04-31.
 */
function isValidCalendarDate(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [yearStr, monthStr, dayStr] = val.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

export function RespondentSurveyForm({
  survey,
  onSubmit,
  isSubmitting,
  submitError,
}: RespondentSurveyFormProps) {
  // Deterministic sorting: 1. order, 2. created_at, 3. id
  const sortedQuestions = [...(survey.questions || [])].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    const dateDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.id.localeCompare(b.id);
  });

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // Clear question error on change if present
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const q of sortedQuestions) {
      const val = answers[q.id];

      // Required question enforcement
      if (q.is_required) {
        if (val === undefined || val === null || val === '') {
          newErrors[q.id] = 'This question requires an answer.';
          continue;
        }

        if (q.question_type === 'text') {
          if (typeof val === 'string' && val.trim().length === 0) {
            newErrors[q.id] = 'Please provide an answer for this question.';
            continue;
          }
        }

        if (q.question_type === 'multiple') {
          if (!Array.isArray(val) || val.length === 0) {
            newErrors[q.id] = 'Please select at least one option.';
            continue;
          }
        }
      }

      // Deep value validation when value is non-empty/answered
      if (val !== undefined && val !== null && val !== '') {
        if (q.question_type === 'number') {
          if (typeof val !== 'number' || !Number.isFinite(val)) {
            newErrors[q.id] = 'Please enter a valid number.';
          }
        } else if (q.question_type === 'boolean') {
          if (typeof val !== 'boolean') {
            newErrors[q.id] = 'Please select Yes or No.';
          }
        } else if (q.question_type === 'date') {
          if (typeof val !== 'string' || !isValidCalendarDate(val)) {
            newErrors[q.id] = 'Please select a valid calendar date in YYYY-MM-DD format.';
          }
        } else if (q.question_type === 'single') {
          const validChoiceIds = new Set(q.choices.map((c) => c.id));
          if (typeof val !== 'string' || !validChoiceIds.has(val)) {
            newErrors[q.id] = 'Please select a valid option from the list.';
          }
        } else if (q.question_type === 'multiple') {
          if (!Array.isArray(val)) {
            newErrors[q.id] = 'Please select valid choices.';
          } else {
            const validChoiceIds = new Set(q.choices.map((c) => c.id));
            const hasInvalidChoice = val.some((cId) => !validChoiceIds.has(cId));
            if (hasInvalidChoice) {
              newErrors[q.id] = 'One or more selected options are invalid.';
            }
          }
        }
      }
    }

    setErrors(newErrors);

    // Focus and scroll to first invalid question if any
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstInvalidId = errorKeys[0];
      const cardEl = document.getElementById(`question-card-${firstInvalidId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.focus();
      }
      return false;
    }

    return true;
  };

  const buildPayload = (): SurveySubmitPayload => {
    const formattedAnswers: AnswerSubmissionItem[] = [];

    for (const q of sortedQuestions) {
      const val = answers[q.id];

      // If optional and unanswered, omit to avoid sending invalid empty strings for number/date/single
      if (val === undefined || val === null || val === '') {
        continue;
      }

      if (q.question_type === 'number') {
        formattedAnswers.push({ question_id: q.id, value: Number(val) });
      } else if (q.question_type === 'boolean') {
        // Boolean false is a valid answer
        formattedAnswers.push({ question_id: q.id, value: Boolean(val) });
      } else if (q.question_type === 'date') {
        formattedAnswers.push({ question_id: q.id, value: String(val) });
      } else if (q.question_type === 'text') {
        // Preserve original text formatting without trimming
        formattedAnswers.push({ question_id: q.id, value: String(val) });
      } else if (q.question_type === 'single') {
        formattedAnswers.push({ question_id: q.id, value: String(val) });
      } else if (q.question_type === 'multiple') {
        if (!Array.isArray(val) || val.length === 0) {
          // Optional unanswered multiple-choice questions remain omitted
          continue;
        }
        // Reject unexpected scalar values and preserve strictly valid choice UUIDs
        const validChoiceIds = new Set(q.choices.map((c) => c.id));
        const validSelected = val.filter(
          (cId): cId is string => typeof cId === 'string' && validChoiceIds.has(cId)
        );
        if (validSelected.length > 0) {
          formattedAnswers.push({
            question_id: q.id,
            value: validSelected,
          });
        }
      }
    }

    return { answers: formattedAnswers };
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) return;

    const payload = buildPayload();
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="space-y-8 animate-fadeIn text-left">
      {/* Survey Title & Header Overview Card */}
      <div className="bg-white rounded-3xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#762D46]">
            <FileText className="w-4 h-4 text-[#762D46]" aria-hidden="true" />
            <span>Questionnaire</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#30232A]">
            {survey.title}
          </h1>
        </div>

        {survey.description && (
          <p className="text-sm text-[#75666D] leading-relaxed whitespace-pre-line border-t border-stone-100 pt-3">
            {survey.description}
          </p>
        )}

        <div className="text-xs text-stone-500 pt-1 flex items-center gap-2">
          <span>{sortedQuestions.length} {sortedQuestions.length === 1 ? 'Question' : 'Questions'}</span>
          <span>•</span>
          <span>All required questions marked with <strong className="text-rose-600">*</strong></span>
        </div>
      </div>

      {/* Questions Stack */}
      <div className="space-y-6">
        {sortedQuestions.map((question, index) => (
          <RespondentQuestionCard
            key={question.id}
            question={question}
            index={index}
            value={answers[question.id] ?? null}
            error={errors[question.id]}
            onChange={(val) => handleAnswerChange(question.id, val)}
            disabled={isSubmitting}
          />
        ))}
      </div>

      {/* Submission Feedback Banner */}
      {submitError && (
        <Alert variant="error" title="Submission Failed">
          <p>{submitError}</p>
        </Alert>
      )}

      {/* Submission Action Bar */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#E9DDE1]/60">
        <p className="text-xs text-[#75666D]">
          Please review your answers before submitting. Responses are final.
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="w-full sm:w-auto min-w-[180px] gap-2 font-bold shadow-md cursor-pointer"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span>{isSubmitting ? 'Submitting...' : 'Submit Response'}</span>
        </Button>
      </div>
    </form>
  );
}
