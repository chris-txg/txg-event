'use client';

import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  Edit3,
  Trash2,
  Lock,
} from 'lucide-react';
import { Question, QuestionType } from '@/features/surveys/types/survey.types';
import { Spinner } from '@/components/ui/Spinner';

export interface QuestionCardProps {
  question: Question;
  index: number;
  totalQuestions: number;
  surveyId: string;
  responseCount: number;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  isReordering?: boolean;
}

export function QuestionCard({
  question,
  index,
  totalQuestions,
  responseCount,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  isReordering = false,
}: QuestionCardProps) {
  const hasResponses = responseCount > 0;
  const isFirst = index === 0;
  const isLast = index === totalQuestions - 1;

  const renderQuestionTypeBadge = (type: QuestionType) => {
    if (type === 'number' && question.is_rating) {
      const minR = question.min_rating ?? 1;
      const maxR = question.max_rating ?? 10;
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
          Rating ({minR} - {maxR})
        </span>
      );
    }

    const labels: Record<QuestionType, { label: string; color: string }> = {
      text: { label: 'Text Prompt', color: 'bg-stone-100 text-stone-700 border-stone-200' },
      number: { label: 'Number (Open)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      single: { label: 'Single Choice', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      multiple: { label: 'Multiple Choice', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      boolean: { label: 'Yes / No', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      date: { label: 'Date Selection', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    };
    const info = labels[type] || { label: type, color: 'bg-stone-100 text-stone-700 border-stone-200' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${info.color}`}>
        {info.label}
      </span>
    );
  };

  return (
    <div className="p-5 rounded-2xl border border-stone-200 bg-[#FDFBFB] hover:bg-white hover:border-[#762D46]/30 transition-all space-y-4 shadow-2xs group text-left">
      <div className="flex items-start justify-between gap-4">
        {/* Left side: Order reordering buttons + order number + Question text */}
        <div className="flex items-start gap-3">
          {/* Up / Down reorder arrows */}
          <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst || isReordering}
              className="p-1 rounded text-stone-400 hover:text-[#762D46] hover:bg-stone-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors cursor-pointer"
              title={isFirst ? 'First question' : 'Move question up'}
              aria-label="Move question up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="w-6 h-6 rounded-full bg-[#762D46] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {index + 1}
            </span>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast || isReordering}
              className="p-1 rounded text-stone-400 hover:text-[#762D46] hover:bg-stone-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition-colors cursor-pointer"
              title={isLast ? 'Last question' : 'Move question down'}
              aria-label="Move question down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Question text & order tag */}
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#30232A] leading-snug">
              {question.text}
            </h4>
            <div className="flex items-center gap-2 pt-0.5">
              {renderQuestionTypeBadge(question.question_type)}
              {question.is_required ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                  Required
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-stone-100 text-stone-500 border border-stone-200">
                  Optional
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Action buttons (Edit & Delete) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isReordering && (
            <div className="mr-2">
              <Spinner size="sm" />
            </div>
          )}

          {hasResponses ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-400 text-xs font-semibold border border-stone-200 cursor-not-allowed select-none"
              title="Question wording, required status, and choices are permanently locked because participant responses have already been recorded"
            >
              <Lock className="w-3.5 h-3.5 text-stone-400" />
              <span>Locked</span>
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-stone-700 hover:text-[#762D46] hover:bg-[#F4E5EA]/40 text-xs font-semibold border border-stone-200 shadow-2xs transition-colors cursor-pointer"
                title="Edit question"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold border border-rose-200 shadow-2xs transition-colors cursor-pointer"
                title="Delete question"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Choice Options for single/multiple questions */}
      {question.choices && question.choices.length > 0 && (
        <div className="ml-9 pl-3.5 border-l-2 border-[#E9DDE1] space-y-2 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#421827]/70">
            Response Choices ({question.choices.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {question.choices.map((choice, cIndex) => (
              <div
                key={choice.id || cIndex}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-[#30232A]"
              >
                <span className="w-2 h-2 rounded-full border border-[#762D46]" />
                <span className="truncate">{choice.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
