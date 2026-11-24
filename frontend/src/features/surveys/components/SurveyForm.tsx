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
import { scrollToFirstFormError, getNowDateTimeLocalString } from '@/lib/utils/formValidation';
import { getFieldClass } from '@/lib/utils/formStyles';

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
    allow_anonymous: initialData?.allow_anonymous ?? false,
    duplicate_rule: initialData?.duplicate_rule ?? 'one_per_user',
    start_date: toLocalDatetimeInput(initialData?.start_date),
    end_date: toLocalDatetimeInput(initialData?.end_date),
  };

  const [minDateTime, setMinDateTime] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMinDateTime(getNowDateTimeLocalString());
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SurveyFormInput>({
    resolver: zodResolver(createSurveySchema),
    defaultValues,
  });

  // Keep project field updated when effectiveProjectId changes or projects load
  useEffect(() => {
    if (effectiveProjectId) {
      setValue('project', effectiveProjectId, { shouldValidate: true });
    }
  }, [effectiveProjectId, setValue]);

  // If projects finish loading in create mode and no project is selected yet, pre-select the first one
  useEffect(() => {
    if (mode === 'create' && !lockedProjectId && projects && projects.length > 0) {
      const currentVal = watch('project');
      if (!currentVal) {
        setValue('project', projects[0].id, { shouldValidate: true });
      }
    }
  }, [mode, lockedProjectId, projects, setValue, watch]);

  const watchedAllowAnonymous = watch('allow_anonymous');
  const watchedVisibility = watch('visibility');

  const handleFormSubmit = async (data: SurveyFormInput) => {
    setGeneralError(null);
    try {
      const validated = data as SurveyFormOutput;
      const formattedPayload = {
        project: validated.project,
        title: validated.title.trim(),
        description: validated.description?.trim() || undefined,
        visibility: validated.visibility,
        allow_anonymous: validated.allow_anonymous,
        duplicate_rule: validated.duplicate_rule,
        start_date: toBackendIsoString(validated.start_date),
        end_date: toBackendIsoString(validated.end_date),
      };

      await onSubmit(formattedPayload);
    } catch (err) {
      if (err instanceof SurveyApiError) {
        setGeneralError(err.message);
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('An unexpected error occurred while saving the survey.');
      }
    }
  };

  const activeError = externalSubmitError || generalError;

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit, (errs) => scrollToFirstFormError(errs))}
      className="space-y-8 text-left max-w-4xl"
      noValidate
    >
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
              Select Event Project <span className="text-rose-500 font-bold ml-1">*</span>
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
                  aria-invalid={Boolean(errors.project)}
                  {...register('project')}
                  className={getFieldClass(Boolean(errors.project), 'cursor-pointer')}
                >
                  <option value="">-- Choose an Event Project --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.project_name} ({proj.event_category || 'General'})
                    </option>
                  ))}
                </select>
                {errors.project && (
                  <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">
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
          label="Survey Title"
          required
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
            aria-invalid={Boolean(errors.description)}
            className={getFieldClass(Boolean(errors.description), 'resize-y')}
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.description.message}</p>
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
              min={mode === 'create' ? minDateTime : undefined}
              aria-invalid={Boolean(errors.start_date)}
              className={getFieldClass(Boolean(errors.start_date))}
              {...register('start_date')}
            />
            {errors.start_date && (
              <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.start_date.message}</p>
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
              min={watch('start_date') || (mode === 'create' ? minDateTime : undefined)}
              aria-invalid={Boolean(errors.end_date)}
              className={getFieldClass(Boolean(errors.end_date))}
              {...register('end_date')}
            />
            {errors.end_date && (
              <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.end_date.message}</p>
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
            Survey Visibility <span className="text-rose-500 font-bold ml-1">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer bg-white transition-all has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30 ${
                errors.visibility ? 'border-rose-400 bg-rose-50/10' : 'border-stone-200 hover:border-[#762D46]/40'
              }`}
            >
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

            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer bg-white transition-all has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30 ${
                errors.visibility ? 'border-rose-400 bg-rose-50/10' : 'border-stone-200 hover:border-[#762D46]/40'
              }`}
            >
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
            <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.visibility.message}</p>
          )}
        </div>

        {/* Duplicate Rules */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#421827]/80">
            Duplicate Response Prevention
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white transition-all has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30">
              <input
                type="radio"
                value="one_per_user"
                {...register('duplicate_rule')}
                className="mt-0.5 text-[#762D46] focus:ring-[#762D46]"
              />
              <div>
                <div className="text-xs font-semibold text-[#30232A]">One per User Account</div>
                <p className="text-[11px] text-stone-500 mt-0.5">Requires respondent sign-in</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white transition-all has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30">
              <input
                type="radio"
                value="one_per_ip"
                {...register('duplicate_rule')}
                className="mt-0.5 text-[#762D46] focus:ring-[#762D46]"
              />
              <div>
                <div className="text-xs font-semibold text-[#30232A]">One per IP Address</div>
                <p className="text-[11px] text-stone-500 mt-0.5">Device & network tracking</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-[#762D46]/40 cursor-pointer bg-white transition-all has-checked:border-[#762D46] has-checked:bg-[#F4E5EA]/30">
              <input
                type="radio"
                value="allow_multiple"
                {...register('duplicate_rule')}
                className="mt-0.5 text-[#762D46] focus:ring-[#762D46]"
              />
              <div>
                <div className="text-xs font-semibold text-[#30232A]">Allow Multiple</div>
                <p className="text-[11px] text-stone-500 mt-0.5">Unrestricted submissions</p>
              </div>
            </label>
          </div>
          {errors.duplicate_rule && (
            <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.duplicate_rule.message}</p>
          )}
        </div>

        {/* Anonymous Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50/50">
          <div className="space-y-0.5 pr-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#30232A]">
              <UserCheck className="w-4 h-4 text-[#762D46]" />
              <span>Allow Anonymous Submissions</span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              When enabled, respondents will not have their usernames or accounts recorded with their answers.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              {...register('allow_anonymous')}
            />
            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#762D46]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#762D46]"></div>
          </label>
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-200">
        <Link
          href={
            lockedProjectId
              ? `/projects/${lockedProjectId}`
              : initialData?.id
              ? `/surveys/${initialData.id}`
              : '/surveys'
          }
        >
          <Button variant="ghost" type="button" disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Cancel</span>
          </Button>
        </Link>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-1.5" />
          <span>{mode === 'create' ? 'Create Survey & Continue' : 'Save Changes'}</span>
        </Button>
      </div>
    </form>
  );
}
