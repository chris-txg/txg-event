'use client';

import React from 'react';
import { Question, AnswerValue } from '@/features/surveys/types/survey.types';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';
import { Check, Circle } from 'lucide-react';

export interface RespondentQuestionInputProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  error?: string;
  disabled?: boolean;
}

export function RespondentQuestionInput({
  question,
  value,
  onChange,
  error,
  disabled = false,
}: RespondentQuestionInputProps) {
  const { question_type: type, choices = [], id: questionId } = question;
  const inputId = `question-input-${questionId}`;
  const errorId = `question-error-${questionId}`;

  // 1. Text Prompt Input
  if (type === 'text') {
    const textVal = typeof value === 'string' ? value : '';
    return (
      <div className="w-full">
        <textarea
          id={inputId}
          name={inputId}
          rows={3}
          value={textVal}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your response here..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full rounded-xl border border-stone-200 bg-white p-3.5 text-sm text-[#421827] placeholder:text-stone-400 transition-all duration-200 focus:outline-none focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20 disabled:bg-stone-50 disabled:cursor-not-allowed resize-y min-h-[90px]',
            error && 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-900'
          )}
        />
      </div>
    );
  }

  // 2. Number / Numeric Rating Input
  if (type === 'number') {
    const numVal = typeof value === 'number' && Number.isFinite(value) ? value : '';
    return (
      <div className="w-full max-w-xs">
        <Input
          id={inputId}
          name={inputId}
          type="number"
          step="any"
          value={numVal}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? null : Number(raw));
          }}
          placeholder="Enter numeric value..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          error={error}
        />
      </div>
    );
  }

  // 3. Date Selection Input
  if (type === 'date') {
    const dateVal = typeof value === 'string' ? value : '';
    return (
      <div className="w-full max-w-xs">
        <Input
          id={inputId}
          name={inputId}
          type="date"
          value={dateVal}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? null : raw);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          error={error}
        />
      </div>
    );
  }

  // 4. Yes / No Boolean Toggle Controls
  if (type === 'boolean') {
    const isYes = value === true;
    const isNo = value === false;

    return (
      <div
        role="radiogroup"
        aria-labelledby={`question-label-${questionId}`}
        aria-describedby={error ? errorId : undefined}
        className="flex items-center gap-3 pt-1"
      >
        <button
          type="button"
          disabled={disabled}
          role="radio"
          aria-checked={isYes}
          onClick={() => {
            if (disabled) return;
            // Allow deselecting optional questions
            if (isYes && !question.is_required) {
              onChange(null);
            } else {
              onChange(true);
            }
          }}
          className={cn(
            'flex-1 sm:flex-none sm:w-28 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed select-none',
            isYes
              ? 'bg-[#762D46] text-white border-[#762D46] shadow-xs'
              : 'bg-white text-stone-700 border-stone-200 hover:border-[#762D46]/40 hover:bg-[#F4E5EA]/20'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
              isYes ? 'border-white bg-white text-[#762D46]' : 'border-stone-300'
            )}
          >
            {isYes && <div className="w-2 h-2 rounded-full bg-[#762D46]" />}
          </div>
          <span>Yes</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          role="radio"
          aria-checked={isNo}
          onClick={() => {
            if (disabled) return;
            // Allow deselecting optional questions
            if (isNo && !question.is_required) {
              onChange(null);
            } else {
              onChange(false);
            }
          }}
          className={cn(
            'flex-1 sm:flex-none sm:w-28 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed select-none',
            isNo
              ? 'bg-[#762D46] text-white border-[#762D46] shadow-xs'
              : 'bg-white text-stone-700 border-stone-200 hover:border-[#762D46]/40 hover:bg-[#F4E5EA]/20'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
              isNo ? 'border-white bg-white text-[#762D46]' : 'border-stone-300'
            )}
          >
            {isNo && <div className="w-2 h-2 rounded-full bg-[#762D46]" />}
          </div>
          <span>No</span>
        </button>
      </div>
    );
  }

  // 5. Single Choice (Radio List using Choice UUIDs)
  if (type === 'single') {
    const currentChoiceId = typeof value === 'string' ? value : null;

    return (
      <div
        role="radiogroup"
        aria-labelledby={`question-label-${questionId}`}
        aria-describedby={error ? errorId : undefined}
        className="space-y-2 pt-1"
      >
        {choices.map((choice) => {
          const isSelected = currentChoiceId === choice.id;
          return (
            <div
              key={choice.id}
              role="radio"
              tabIndex={disabled ? -1 : 0}
              aria-checked={isSelected}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onChange(isSelected && !question.is_required ? null : choice.id);
                }
              }}
              onClick={() => {
                if (disabled) return;
                onChange(isSelected && !question.is_required ? null : choice.id);
              }}
              className={cn(
                'w-full p-3.5 rounded-xl border text-sm transition-all flex items-center gap-3 cursor-pointer select-none text-left focus:outline-none focus:ring-2 focus:ring-[#762D46]/20',
                isSelected
                  ? 'bg-[#F4E5EA]/60 border-[#762D46] text-[#421827] font-semibold'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-[#762D46]/40 hover:bg-[#F4E5EA]/10',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                  isSelected ? 'border-[#762D46] bg-[#762D46]' : 'border-stone-300 bg-white'
                )}
              >
                {isSelected && <Circle className="w-2 h-2 fill-white text-white" />}
              </div>
              <span className="flex-1 leading-snug">{choice.text}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // 6. Multiple Choice (Checkbox List using Choice UUIDs)
  if (type === 'multiple') {
    const selectedChoiceIds = Array.isArray(value) ? value : [];

    const handleToggle = (choiceId: string) => {
      if (disabled) return;
      if (selectedChoiceIds.includes(choiceId)) {
        onChange(selectedChoiceIds.filter((id) => id !== choiceId));
      } else {
        onChange([...selectedChoiceIds, choiceId]);
      }
    };

    return (
      <div
        role="group"
        aria-labelledby={`question-label-${questionId}`}
        aria-describedby={error ? errorId : undefined}
        className="space-y-2 pt-1"
      >
        {choices.map((choice) => {
          const isSelected = selectedChoiceIds.includes(choice.id);
          return (
            <div
              key={choice.id}
              role="checkbox"
              tabIndex={disabled ? -1 : 0}
              aria-checked={isSelected}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleToggle(choice.id);
                }
              }}
              onClick={() => handleToggle(choice.id)}
              className={cn(
                'w-full p-3.5 rounded-xl border text-sm transition-all flex items-center gap-3 cursor-pointer select-none text-left focus:outline-none focus:ring-2 focus:ring-[#762D46]/20',
                isSelected
                  ? 'bg-[#F4E5EA]/60 border-[#762D46] text-[#421827] font-semibold'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-[#762D46]/40 hover:bg-[#F4E5EA]/10',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                  isSelected ? 'border-[#762D46] bg-[#762D46] text-white' : 'border-stone-300 bg-white'
                )}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="flex-1 leading-snug">{choice.text}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
