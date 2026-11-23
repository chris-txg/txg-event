'use client';

import React from 'react';
import { Question, AnswerValue } from '@/features/surveys/types/survey.types';
import { RespondentQuestionInput } from './RespondentQuestionInput';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface RespondentQuestionCardProps {
  question: Question;
  index: number;
  value: AnswerValue;
  error?: string;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}

export function RespondentQuestionCard({
  question,
  index,
  value,
  error,
  onChange,
  disabled = false,
}: RespondentQuestionCardProps) {
  const cardId = `question-card-${question.id}`;
  const labelId = `question-label-${question.id}`;
  const errorId = `question-error-${question.id}`;

  return (
    <div
      id={cardId}
      tabIndex={-1}
      className={cn(
        'p-5 sm:p-6 rounded-2xl border bg-white shadow-2xs transition-all space-y-4 text-left focus:outline-none focus:ring-2 focus:ring-[#762D46]/20',
        error
          ? 'border-rose-300 ring-2 ring-rose-500/10'
          : 'border-[#E9DDE1] hover:border-[#762D46]/30'
      )}
    >
      {/* Header: Question Number & Requirement Indicator */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-[#762D46] uppercase tracking-wider">
          Question {index + 1}
        </span>
        {question.is_required ? (
          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <span>Required</span>
            <span aria-hidden="true">*</span>
          </span>
        ) : (
          <span className="inline-flex items-center font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
            Optional
          </span>
        )}
      </div>

      {/* Question Prompt Text */}
      <h3
        id={labelId}
        className="text-base sm:text-lg font-bold text-[#30232A] leading-snug whitespace-pre-line"
      >
        {question.text}
      </h3>

      {/* Question Input Control */}
      <div className="pt-1">
        <RespondentQuestionInput
          question={question}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      </div>

      {/* Inline Validation Error Message */}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 pt-1 animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
