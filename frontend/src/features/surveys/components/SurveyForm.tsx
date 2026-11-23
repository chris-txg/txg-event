'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  createSurveySchema,
} from '@/features/surveys/schemas/survey.schema';

type SurveyFormInput = z.input<typeof createSurveySchema>;
type SurveyFormOutput = z.output<typeof createSurveySchema>;
import {
  SurveyDetail,
  SurveyVisibility,
  DuplicateRule,
} from '@/features/surveys/types/survey.types';
import { projectClientService } from '@/features/projects/services/projectClientService';
import { SurveyApiError } from '@/features/surveys/hooks/useSurveys';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import {
  ClipboardList,
  FolderKanban,
  Calendar,
  Lock,
  Globe,
  ShieldCheck,
  UserCheck,
  Clock,
  ArrowLeft,
  Save,
} from 'lucide-react';

function toLocalDatetimeInput(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${mins}`;
  } catch {
    return '';
  }
}

function toBackendIsoString(localValue?: string | null): string | null {
  if (!localValue || localValue.trim() === '') return null;
  try {
    const d = new Date(localValue);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export interface SurveyFormProps {
  mode: 'create' | 'edit';
  initialData?: SurveyDetail;
  lockedProjectId?: string;
  lockedProjectName?: string;
  onSubmit: (payload: {
    project: string;
    title: string;
    description?: string;
    visibility: SurveyVisibility;
    allow_anonymous: boolean;
    duplicate_rule: DuplicateRule;
    start_date?: string | null;
    end_date?: string | null;
  }) => Promise<void>;
  isSubmitting: boolean;
  submitError?: string | null;
}

export function SurveyForm({
  mode,
  initialData,
  lockedProjectId,
  lockedProjectName,
  onSubmit,
  isSubmitting,
  submitError: externalSubmitError,
}: SurveyFormProps) {
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Fetch organiser projects if not pre-locked
  const shouldFetchProjects = mode === 'create' && !lockedProjectId;
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', 'selector'],
    queryFn: async () => {
      const res = await projectClientService.getProjects({ page_size: 100 });
      if (!res.ok || !res.data) {
        throw new Error('Failed to load projects');
      }
      return res.data.results;
    },
    enabled: shouldFetchProjects,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveProjectId =
    lockedProjectId ||
    initialData?.project ||
    '';

  const defaultValues: SurveyFormInput = {
    project: effectiveProjectId,
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    visibility: initialData?.visibility ?? 'public',
    allow_anonymous: initialData?.allow_anonymous ?? true,
    duplicate_rule: initialData?.duplicate_rule ?? 'one_per_ip',
    start_date: toLocalDatetimeInput(initialData?.start_date),
    end_date: toLocalDatetimeInput(initialData?.end_date),
  };

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SurveyFormInput, unknown, SurveyFormOutput>({
    resolver: zodResolver(createSurveySchema),
    defaultValues,
  });

  useEffect(() => {
    if (lockedProjectId) {
      setValue('project', lockedProjectId);
    }
  }, [lockedProjectId, setValue]);

  const handleFormSubmit = async (values: SurveyFormOutput) => {
    setGeneralError(null);

    const formattedPayload = {
      project: values.project,
      title: values.title.trim(),
      description: values.description ? values.description.trim() : '',
      visibility: values.visibility,
      allow_anonymous: values.allow_anonymous,
      duplicate_rule: values.duplicate_rule,
      start_date: toBackendIsoString(values.start_date),
      end_date: toBackendIsoString(values.end_date),
    };

    try {
      await onSubmit(formattedPayload);
    } catch (err) {
      if (err instanceof SurveyApiError) {
        if (err.originalError && typeof err.originalError === 'object') {
          const errObj = err.originalError as Record<string, unknown>;
          let fieldHandled = false;

          for (const [key, val] of Object.entries(errObj)) {
            if (key === 'project' || key === 'title' || key === 'description' || key === 'start_date' || key === 'end_date') {
              const msg = Array.isArray(val) ? val.join(' ') : String(val);
              setError(key as keyof SurveyFormInput, { message: msg });
              fieldHandled = true;
            }
          }

          if (!fieldHandled) {
            setGeneralError(err.message);
          }
        } else {
          setGeneralError(err.message);
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const activeError = generalError || externalSubmitError;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 text-left max-w-4xl">
      {activeError && (
        <Alert variant="error" className="animate-shake">
          {activeError}
        </Alert>
      )}

      {/* Section 1: Project Association */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#F8EFF2]">
          <div className="w-10 h-10 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-[#A84A63]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#30232A]">Event Project Association</h3>
            <p className="text-xs text-[#75666D]">
              Every survey is scoped to an Event Project owned by your account.
            </p>
          </div>
        </div>

        {mode === 'edit' || lockedProjectId ? (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80">
              Assigned Project
            </label>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-[#421827]">
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-4 h-4 text-[#762D46]" />
                <span className="font-semibold">
                  {lockedProjectName || initialData?.project_name || 'Current Event Project'}
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  ({lockedProjectId || initialData?.project})
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-200 text-stone-700">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            </div>
            <input type="hidden" {...register('project')} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label
              htmlFor="survey-project-select"
              className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80"
            >
              Select Event Project <span className="text-rose-500">*</span>
            </label>

            {isLoadingProjects ? (
              <div className="flex items-center gap-2 p-3 text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                <Spinner size="sm" />
                <span>Loading your event projects...</span>
              </div>
            ) : projects && projects.length > 0 ? (
              <div>
                <select
                  id="survey-project-select"
                  {...register('project')}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#421827] focus:outline-none focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20 transition-all cursor-pointer"
                >
                  <option value="">-- Choose an Event Project --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.project_name} ({proj.event_category || 'General'})
                    </option>
                  ))}
                </select>
                {errors.project && (
                  <p className="text-xs text-rose-600 font-medium mt-1">
                    {errors.project.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <p className="font-semibold">No Event Projects found</p>
                <p>You need to create an Event Project before authoring surveys.</p>
                <Link
                  href="/projects/new"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#762D46] hover:underline"
                >
                  <span>Create an Event Project first &rarr;</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Survey Metadata */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#F8EFF2]">
          <div className="w-10 h-10 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#A84A63]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#30232A]">Survey Information</h3>
            <p className="text-xs text-[#75666D]">
              Define public title, respondent instructions, and scheduling.
            </p>
          </div>
        </div>

        {/* Title */}
        <Input
          label="Survey Title *"
          placeholder="e.g. 2026 Tech Summit Attendee Preferences & Feedback"
          error={errors.title?.message}
          {...register('title')}
        />

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="survey-description"
            className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80"
          >
            Description / Instructions
          </label>
          <textarea
            id="survey-description"
            rows={4}
            placeholder="Explain the purpose of this survey, expected completion time, or guidelines for respondents..."
            className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#421827] placeholder:text-stone-400 focus:outline-none focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20 transition-all resize-y"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-rose-600 font-medium">{errors.description.message}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="survey-start-date"
              className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#762D46]" />
              Start Date & Time (Optional)
            </label>
            <input
              id="survey-start-date"
              type="datetime-local"
              className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#421827] focus:outline-none focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20 transition-all"
              {...register('start_date')}
            />
            {errors.start_date && (
              <p className="text-xs text-rose-600 font-medium">{errors.start_date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="survey-end-date"
              className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-[#762D46]" />
              End Date & Time (Optional)
            </label>
            <input
              id="survey-end-date"
              type="datetime-local"
              className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#421827] focus:outline-none focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/20 transition-all"
              {...register('end_date')}
            />
            {errors.end_date && (
              <p className="text-xs text-rose-600 font-medium">{errors.end_date.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Participation & Compliance Policies */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#F8EFF2]">
          <div className="w-10 h-10 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#A84A63]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#30232A]">Participation Rules & Visibility</h3>
            <p className="text-xs text-[#75666D]">
              Configure respondent eligibility, privacy policies, and duplicate submission controls.
            </p>
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80">
            Survey Visibility <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white transition-all has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30">
              <input
                type="radio"
                value="public"
                {...register('visibility')}
                className="mt-0.5 text-[#762D46] focus:ring-[#762D46]"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#30232A]">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Public Survey</span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Discoverable by audience members; anyone with link can take it when published.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white transition-all has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30">
              <input
                type="radio"
                value="private"
                {...register('visibility')}
                className="mt-0.5 text-[#762D46] focus:ring-[#762D46]"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#30232A]">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>Private Survey</span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Restricted to invited attendees; requires authenticated account access.
                </p>
              </div>
            </label>
          </div>
          {errors.visibility && (
            <p className="text-xs text-rose-600 font-medium">{errors.visibility.message}</p>
          )}
        </div>

        {/* Anonymous Responses */}
        <div className="pt-2">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white transition-all">
            <input
              type="checkbox"
              {...register('allow_anonymous')}
              className="mt-0.5 w-4 h-4 rounded text-[#762D46] focus:ring-[#762D46]"
            />
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#30232A]">
                <UserCheck className="w-4 h-4 text-[#762D46]" />
                <span>Allow Anonymous Submissions</span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Participants do not need to sign in to submit responses. Recommended for broad attendee market research.
              </p>
            </div>
          </label>
        </div>

        {/* Duplicate Submission Rule */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80">
            Duplicate Response Rule <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white text-xs has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30 transition-all">
              <input
                type="radio"
                value="one_per_ip"
                {...register('duplicate_rule')}
                className="mt-0.5 text-[#762D46] focus:ring-[#762D46]"
              />
              <div>
                <span className="font-semibold text-[#30232A] block">One per IP</span>
                <span className="text-stone-500 text-[11px] block mt-0.5">
                  Enforces 1 response per IP address.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white text-xs has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30 transition-all">
              <input
                type="radio"
                value="one_per_user"
                {...register('duplicate_rule')}
                className="mt-0.5 text-[#762D46] focus:ring-[#762D46]"
              />
              <div>
                <span className="font-semibold text-[#30232A] block">One per User</span>
                <span className="text-stone-500 text-[11px] block mt-0.5">
                  Requires user authentication.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white text-xs has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30 transition-all">
              <input
                type="radio"
                value="allow_multiple"
                {...register('duplicate_rule')}
                className="mt-0.5 text-[#762D46] focus:ring-[#762D46]"
              />
              <div>
                <span className="font-semibold text-[#30232A] block">Allow Multiple</span>
                <span className="text-stone-500 text-[11px] block mt-0.5">
                  Allows multiple repeat submissions.
                </span>
              </div>
            </label>
          </div>
          {errors.duplicate_rule && (
            <p className="text-xs text-rose-600 font-medium">{errors.duplicate_rule.message}</p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#E9DDE1]">
        <Link
          href={
            mode === 'edit' && initialData
              ? `/surveys/${initialData.id}`
              : lockedProjectId
              ? `/projects/${lockedProjectId}`
              : '/surveys'
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </Link>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{mode === 'create' ? 'Create Survey' : 'Save Changes'}</span>
        </Button>
      </div>
    </form>
  );
}
