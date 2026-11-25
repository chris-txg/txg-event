'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  projectFormSchema,
  ProjectFormData,
} from '@/features/projects/schemas/project.schema';
import {
  EventProjectDetail,
  SupportingDocument,
} from '@/features/projects/types/project.types';
import {
  FolderKanban,
  ArrowLeft,
  Upload,
  X,
  FileText,
  AlertCircle,
  Save,
  CheckCircle2,
  Calendar,
  Building,
  MapPin,
  Sparkles,
  Clock,
  Trash2,
  Download,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { scrollToFirstFormError, preventNonNumericInput, getTodayDateString } from '@/lib/utils/formValidation';
import { getFieldClass } from '@/lib/utils/formStyles';

export interface ProjectFormProps {
  mode: 'create' | 'edit';
  initialData?: EventProjectDetail;
  onSubmit: (formData: FormData, status: 'draft' | 'created') => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
  existingDocuments?: SupportingDocument[];
  onDeleteDocument?: (documentId: string) => Promise<void>;
}

export function ProjectForm({
  mode,
  initialData,
  onSubmit,
  isSubmitting,
  submitError,
  existingDocuments = [],
  onDeleteDocument,
}: ProjectFormProps) {
  const isDraftMode = mode === 'edit' && initialData?.status === 'draft';
  const isCreatedMode = mode === 'edit' && initialData?.status === 'created';

  const [minDate, setMinDate] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    setMinDate(getTodayDateString());
  }, []);

  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [localSubmitError, setLocalSubmitError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const initialServices =
    initialData?.required_services && initialData.required_services.length > 0
      ? initialData.required_services
      : ['Research', 'Audience Surveys'];

  const [selectedServices, setSelectedServices] = useState<string[]>(initialServices);

  // Parse initial budget range if present (e.g. "50000 - 100000" or single exact "75000")
  const initialBudgetRaw = (initialData?.estimated_budget_range || '').trim();
  let parsedMin = '';
  let parsedMax = '';
  let parsedIsExact = false;

  if (initialBudgetRaw) {
    if (initialBudgetRaw.includes('-')) {
      const parts = initialBudgetRaw.split('-').map((s) => s.replace(/[^0-9.]/g, '').trim());
      parsedMin = parts[0] || '';
      parsedMax = parts[1] || '';
      parsedIsExact = false;
    } else {
      parsedMin = initialBudgetRaw.replace(/[^0-9.]/g, '').trim();
      parsedMax = '';
      parsedIsExact = true;
    }
  }

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      status: initialData?.status ?? 'created',
      project_name: initialData?.project_name ?? '',
      event_segment: initialData?.event_segment ?? '',
      event_category: initialData?.event_category ?? '',
      event_subcategory: initialData?.event_subcategory ?? '',
      project_description: initialData?.project_description ?? '',
      event_objective: initialData?.event_objective ?? '',
      organiser_name: initialData?.organiser_name ?? '',
      designation: initialData?.designation ?? '',
      official_email: initialData?.official_email ?? '',
      contact_number: initialData?.contact_number ?? '',
      organiser_country: initialData?.organiser_country ?? '',
      organiser_region: initialData?.organiser_region ?? '',
      event_country: initialData?.event_country ?? '',
      event_state: initialData?.event_state ?? '',
      event_city: initialData?.event_city ?? '',
      event_locality: initialData?.event_locality ?? '',
      event_format: initialData?.event_format ?? '',
      proposed_date: initialData?.proposed_date ?? '',
      duration: initialData?.duration ?? '',
      expected_attendance:
        initialData?.expected_attendance !== undefined && initialData?.expected_attendance !== null
          ? String(initialData.expected_attendance)
          : '',
      target_audience: initialData?.target_audience ?? '',
      estimated_budget_range: initialData?.estimated_budget_range ?? '',
      is_exact_budget: parsedIsExact,
      budget_min: parsedMin,
      budget_max: parsedMax,
      currency: initialData?.currency ?? 'USD',
      required_services: initialServices,
      research_objective: initialData?.research_objective ?? '',
      research_start_date: initialData?.research_start_date ?? '',
      research_end_date: initialData?.research_end_date ?? '',
    },
  });

  const isExactBudget = watch('is_exact_budget');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const validFiles: File[] = [];

    for (const f of newFiles) {
      if (f.size > 10 * 1024 * 1024) {
        setFileError(`File "${f.name}" exceeds the 10 MB maximum upload limit.`);
        return;
      }
      validFiles.push(f);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleServiceToggle = (service: string) => {
    const updated = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];
    setSelectedServices(updated);
    setValue('required_services', updated);
  };

  const buildFormData = (data: ProjectFormData, status: 'draft' | 'created'): FormData => {
    const fd = new FormData();
    fd.append('status', status);
    fd.append('project_name', data.project_name.trim());

    if (data.event_segment) fd.append('event_segment', data.event_segment.trim());
    if (data.event_category) fd.append('event_category', data.event_category.trim());
    if (data.event_subcategory) fd.append('event_subcategory', data.event_subcategory.trim());
    if (data.project_description) fd.append('project_description', data.project_description.trim());
    if (data.event_objective) fd.append('event_objective', data.event_objective.trim());
    if (data.organiser_name) fd.append('organiser_name', data.organiser_name.trim());
    if (data.designation) fd.append('designation', data.designation.trim());
    if (data.official_email) fd.append('official_email', data.official_email.trim());
    if (data.contact_number) fd.append('contact_number', data.contact_number.trim());
    if (data.organiser_country) fd.append('organiser_country', data.organiser_country.trim());
    if (data.organiser_region) fd.append('organiser_region', data.organiser_region.trim());
    if (data.event_country) fd.append('event_country', data.event_country.trim());
    if (data.event_state) fd.append('event_state', data.event_state.trim());
    if (data.event_city) fd.append('event_city', data.event_city.trim());
    if (data.event_locality) fd.append('event_locality', data.event_locality.trim());
    if (data.event_format) fd.append('event_format', data.event_format.trim());
    if (data.proposed_date) fd.append('proposed_date', data.proposed_date);
    if (data.duration) fd.append('duration', data.duration.trim());
    if (data.expected_attendance !== undefined && data.expected_attendance !== null && data.expected_attendance !== '') {
      fd.append('expected_attendance', String(data.expected_attendance));
    }
    if (data.target_audience) fd.append('target_audience', data.target_audience.trim());

    // Format estimated_budget_range based on is_exact_budget and min/max inputs
    const minVal = data.budget_min !== undefined && data.budget_min !== null ? String(data.budget_min).trim() : '';
    const maxVal = data.budget_max !== undefined && data.budget_max !== null ? String(data.budget_max).trim() : '';
    if (data.is_exact_budget) {
      if (minVal) {
        fd.append('estimated_budget_range', minVal);
      }
    } else {
      if (minVal && maxVal) {
        fd.append('estimated_budget_range', `${minVal} - ${maxVal}`);
      } else if (minVal) {
        fd.append('estimated_budget_range', minVal);
      }
    }

    if (data.currency) fd.append('currency', data.currency);

    const services = selectedServices.length > 0 ? selectedServices : [];
    fd.append('required_services', JSON.stringify(services));

    if (data.research_objective) fd.append('research_objective', data.research_objective.trim());
    if (data.research_start_date) fd.append('research_start_date', data.research_start_date);
    if (data.research_end_date) fd.append('research_end_date', data.research_end_date);

    files.forEach((f) => fd.append('uploaded_documents', f));

    return fd;
  };

  const onSaveDraft = async () => {
    setLocalSubmitError(null);
    const data = getValues();
    if (!data.project_name || data.project_name.trim() === '') {
      setLocalSubmitError('Project Name is required to save a draft.');
      const nameInput = document.querySelector<HTMLElement>('input[name="project_name"]');
      nameInput?.focus();
      return;
    }
    const formData = buildFormData(data, 'draft');
    await onSubmit(formData, 'draft');
  };

  const onSubmitCreated = async (data: ProjectFormData) => {
    setLocalSubmitError(null);
    const formData = buildFormData(data, 'created');
    await onSubmit(formData, 'created');
  };

  const handleDeleteExistingDoc = async (docId: string) => {
    if (!onDeleteDocument) return;
    try {
      setDeletingDocId(docId);
      await onDeleteDocument(docId);
    } finally {
      setDeletingDocId(null);
    }
  };

  const activeError = submitError || localSubmitError;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9DDE1]">
        <div className="flex items-center gap-3">
          <Link
            href={mode === 'edit' && initialData?.id ? `/projects/${initialData.id}` : '/projects'}
            className="w-9 h-9 rounded-xl bg-white border border-[#E9DDE1] text-stone-600 hover:text-[#762D46] hover:border-[#762D46] flex items-center justify-center transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F4E5EA] text-[#762D46] mb-1">
              {mode === 'create' && (
                <>
                  <Sparkles className="w-3 h-3 text-[#A84A63]" />
                  <span>New Initiative</span>
                </>
              )}
              {isDraftMode && (
                <>
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span className="text-amber-800">Draft Initiative</span>
                </>
              )}
              {isCreatedMode && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="text-emerald-800">Active Project</span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#30232A]">
              {mode === 'create' && 'Create New Project'}
              {isDraftMode && `Edit Draft: ${initialData?.project_name || 'Project'}`}
              {isCreatedMode && `Edit Project: ${initialData?.project_name || 'Project'}`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCreatedMode && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onSaveDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E9DDE1] text-stone-700 hover:bg-[#F8EFF2] hover:text-[#762D46] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmitCreated, (errs) => scrollToFirstFormError(errs))}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>
              {mode === 'create' && 'Create Project'}
              {isDraftMode && 'Complete & Create Project'}
              {isCreatedMode && 'Save Changes'}
            </span>
          </button>
        </div>
      </div>

      {activeError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold block mb-0.5">Validation / Submission Error</span>
            {activeError}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmitCreated, (errs) => scrollToFirstFormError(errs))}
        className="space-y-8"
        noValidate
      >
        {/* Section 1: Project Identity & Scope */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <FolderKanban className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">1. Project Identity & Scope</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A] flex items-center justify-between">
                <span>
                  Project Name <span className="text-rose-500 font-bold ml-1">*</span>
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Asia-Pacific Tech Expo 2026"
                aria-invalid={Boolean(errors.project_name)}
                {...register('project_name')}
                className={getFieldClass(Boolean(errors.project_name), 'text-xs sm:text-sm')}
              />
              {errors.project_name && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.project_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Segment {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. B2B Corporate / Technology"
                aria-invalid={Boolean(errors.event_segment)}
                {...register('event_segment')}
                className={getFieldClass(Boolean(errors.event_segment), 'text-xs sm:text-sm')}
              />
              {errors.event_segment && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.event_segment.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Category {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. Conference, Exhibition, Summit"
                aria-invalid={Boolean(errors.event_category)}
                {...register('event_category')}
                className={getFieldClass(Boolean(errors.event_category), 'text-xs sm:text-sm')}
              />
              {errors.event_category && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.event_category.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Subcategory <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. AI & Cloud Infrastructure"
                {...register('event_subcategory')}
                className={getFieldClass(false, 'text-xs sm:text-sm')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Format {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <select
                aria-invalid={Boolean(errors.event_format)}
                {...register('event_format')}
                className={getFieldClass(Boolean(errors.event_format), 'text-xs sm:text-sm')}
              >
                <option value="">Select event format</option>
                <option value="Physical / In-Person">Physical / In-Person</option>
                <option value="Virtual / Online">Virtual / Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
              {errors.event_format && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.event_format.message}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Project Description {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder="Provide a comprehensive summary of this event project..."
                aria-invalid={Boolean(errors.project_description)}
                {...register('project_description')}
                className={getFieldClass(Boolean(errors.project_description), 'text-xs sm:text-sm resize-y')}
              />
              {errors.project_description && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.project_description.message}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Objective {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <textarea
                rows={2}
                placeholder="What primary goal or milestone should this event achieve?"
                aria-invalid={Boolean(errors.event_objective)}
                {...register('event_objective')}
                className={getFieldClass(Boolean(errors.event_objective), 'text-xs sm:text-sm resize-y')}
              />
              {errors.event_objective && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.event_objective.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Organiser & Point of Contact */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <Building className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">2. Organiser & Point of Contact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Organiser Name / Entity {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <input
                type="text"
                placeholder="Company / Organization Name"
                aria-invalid={Boolean(errors.organiser_name)}
                {...register('organiser_name')}
                className={getFieldClass(Boolean(errors.organiser_name), 'text-xs sm:text-sm')}
              />
              {errors.organiser_name && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.organiser_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Designation / Role <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Head of Events, Director"
                {...register('designation')}
                className={getFieldClass(false, 'text-xs sm:text-sm')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Official Email {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <input
                type="email"
                placeholder="contact@organisation.com"
                aria-invalid={Boolean(errors.official_email)}
                {...register('official_email')}
                className={getFieldClass(Boolean(errors.official_email), 'text-xs sm:text-sm')}
              />
              {errors.official_email && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.official_email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Controller
                name="contact_number"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    label="Contact Number (Optional)"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.contact_number?.message}
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Organiser Country <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. United States"
                {...register('organiser_country')}
                className={getFieldClass(false, 'text-xs sm:text-sm')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Organiser State / Region <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. California"
                {...register('organiser_region')}
                className={getFieldClass(false, 'text-xs sm:text-sm')}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Event Location */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <MapPin className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">3. Event Location</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Country {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. Singapore"
                aria-invalid={Boolean(errors.event_country)}
                {...register('event_country')}
                className={getFieldClass(Boolean(errors.event_country), 'text-xs sm:text-sm')}
              />
              {errors.event_country && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.event_country.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event City {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. Singapore"
                aria-invalid={Boolean(errors.event_city)}
                {...register('event_city')}
                className={getFieldClass(Boolean(errors.event_city), 'text-xs sm:text-sm')}
              />
              {errors.event_city && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.event_city.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event State / Province <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Central Region"
                {...register('event_state')}
                className={getFieldClass(false, 'text-xs sm:text-sm')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Locality / Specific Venue Area <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Marina Bay Sands Expo Hall 3"
                {...register('event_locality')}
                className={getFieldClass(false, 'text-xs sm:text-sm')}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Event Timeline & Scope */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <Calendar className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">4. Event Timeline & Scope</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Proposed Event Date <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                min={mode === 'create' ? minDate : undefined}
                aria-invalid={Boolean(errors.proposed_date)}
                {...register('proposed_date')}
                className={getFieldClass(Boolean(errors.proposed_date), 'text-xs sm:text-sm')}
              />
              {errors.proposed_date && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.proposed_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Duration <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 3 Days"
                {...register('duration')}
                className={getFieldClass(false, 'text-xs sm:text-sm')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Expected Attendance <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 1500"
                aria-invalid={Boolean(errors.expected_attendance)}
                onKeyDown={(e) => preventNonNumericInput(e, false)}
                {...register('expected_attendance')}
                className={getFieldClass(Boolean(errors.expected_attendance), 'text-xs sm:text-sm')}
              />
              {errors.expected_attendance && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.expected_attendance.message}</p>
              )}
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Target Audience <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Describe key demographic, industry profiles, or attendee criteria..."
                {...register('target_audience')}
                className={getFieldClass(false, 'text-xs sm:text-sm resize-y')}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Budget & Required Services */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <FolderKanban className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">5. Budget & Required Services</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">Currency</label>
              <select
                {...register('currency')}
                className={getFieldClass(false, 'text-xs sm:text-sm')}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="INR">INR (₹)</option>
                <option value="AED">AED (AED)</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#30232A]">
                  {isExactBudget ? 'Exact Budget' : 'Estimated Budget Range'}{' '}
                  <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-[#762D46] font-medium hover:underline select-none">
                  <input
                    type="checkbox"
                    {...register('is_exact_budget')}
                    className="w-3.5 h-3.5 rounded border-stone-300 text-[#762D46] focus:ring-[#762D46]/20 cursor-pointer"
                  />
                  <span>Exact budget (no range)</span>
                </label>
              </div>

              {isExactBudget ? (
                <div className="space-y-1.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 50000"
                    aria-invalid={Boolean(errors.budget_min)}
                    onKeyDown={(e) => preventNonNumericInput(e, false)}
                    {...register('budget_min')}
                    className={getFieldClass(Boolean(errors.budget_min), 'text-xs sm:text-sm')}
                  />
                  {errors.budget_min && (
                    <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.budget_min.message}</p>
                  )}
                  <p className="text-[11px] text-stone-400">Fixed target budget for this project</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Min (e.g. 25000)"
                        aria-invalid={Boolean(errors.budget_min)}
                        onKeyDown={(e) => preventNonNumericInput(e, false)}
                        {...register('budget_min')}
                        className={getFieldClass(Boolean(errors.budget_min), 'text-xs sm:text-sm')}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Max (e.g. 75000)"
                        aria-invalid={Boolean(errors.budget_max)}
                        onKeyDown={(e) => preventNonNumericInput(e, false)}
                        {...register('budget_max')}
                        className={getFieldClass(Boolean(errors.budget_max), 'text-xs sm:text-sm')}
                      />
                    </div>
                  </div>
                  {errors.budget_min && (
                    <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.budget_min.message}</p>
                  )}
                  {errors.budget_max && (
                    <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.budget_max.message}</p>
                  )}
                  <p className="text-[11px] text-stone-400">Enter both minimum and maximum boundaries for range</p>
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-2.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Required Services / Workstreams
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'Research',
                  'Audience Surveys',
                  'Venue Sourcing',
                  'Catering & Hospitality',
                  'Audio Visual & Production',
                  'Marketing & Promotion',
                  'Security & Permitting',
                  'Logistics & Transport',
                ].map((svc) => {
                  const isSelected = selectedServices.includes(svc);
                  return (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => handleServiceToggle(svc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#762D46] text-white border-[#762D46] shadow-xs'
                          : 'bg-[#FBF7F8] text-stone-600 border-[#E9DDE1] hover:bg-[#F4E5EA]/40'
                      }`}
                    >
                      {svc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Research & Audience Intelligence */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <FileText className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">6. Research & Audience Intelligence</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Research Objective {!isDraftMode && <span className="text-rose-500 font-bold ml-1">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder="Specify the market research, attendee preferences, or survey goals for this initiative..."
                aria-invalid={Boolean(errors.research_objective)}
                {...register('research_objective')}
                className={getFieldClass(Boolean(errors.research_objective), 'text-xs sm:text-sm resize-y')}
              />
              {errors.research_objective && (
                <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.research_objective.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#30232A]">
                  Research Window Start Date <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  min={mode === 'create' ? minDate : undefined}
                  aria-invalid={Boolean(errors.research_start_date)}
                  {...register('research_start_date')}
                  className={getFieldClass(Boolean(errors.research_start_date), 'text-xs sm:text-sm')}
                />
                {errors.research_start_date && (
                  <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.research_start_date.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#30232A]">
                  Research Window End Date <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  min={watch('research_start_date') || (mode === 'create' ? minDate : undefined)}
                  aria-invalid={Boolean(errors.research_end_date)}
                  {...register('research_end_date')}
                  className={getFieldClass(Boolean(errors.research_end_date), 'text-xs sm:text-sm')}
                />
                {errors.research_end_date && (
                  <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{errors.research_end_date.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Supporting Documents */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <Upload className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">7. Supporting Documents</h2>
          </div>

          <div className="space-y-4">
            {/* Existing Documents List (Edit Mode) */}
            {mode === 'edit' && existingDocuments.length > 0 && (
              <div className="space-y-2 pb-4 border-b border-[#F8EFF2]">
                <p className="text-xs font-semibold text-[#30232A]">
                  Existing Uploaded Documents ({existingDocuments.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {existingDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        <FileText className="w-4 h-4 text-[#762D46] shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-[#30232A] truncate">
                            {doc.original_filename}
                          </p>
                          <p className="text-[10px] text-[#75666D]">
                            {(doc.file_size / 1024).toFixed(0)} KB &bull;{' '}
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.file && (
                          <a
                            href={doc.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-600 hover:text-[#762D46] hover:bg-[#F4E5EA] rounded-md transition-colors"
                            title="Download / View document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {onDeleteDocument && (
                          <button
                            type="button"
                            disabled={deletingDocId === doc.id}
                            onClick={() => handleDeleteExistingDoc(doc.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete this document"
                          >
                            {deletingDocId === doc.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Zone for New Documents */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                {mode === 'edit' && existingDocuments.length > 0
                  ? 'Add New Supporting Files'
                  : 'Supporting Document Files'}{' '}
                <span className="text-stone-400 font-normal">
                  (Max 10 MB per file, PDF, Word, Excel, Images)
                </span>
              </label>

              <div className="border-2 border-dashed border-[#E9DDE1] hover:border-[#762D46] rounded-2xl p-6 text-center bg-[#FBF7F8] hover:bg-[#F4E5EA]/20 transition-all cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-[#F4E5EA] flex items-center justify-center text-[#762D46] mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-[#30232A]">
                    Click to browse or drag & drop files here
                  </p>
                  <p className="text-[11px] text-[#75666D] mt-0.5">
                    Supporting concept notes, budgets, venue specs, or questionnaire models
                  </p>
                </div>
              </div>

              {fileError && <p className="text-xs text-rose-600 font-medium mt-1 leading-tight">{fileError}</p>}
            </div>

            {/* List of Newly Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-[#30232A]">
                  Files Ready to Upload ({files.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate mr-2">
                        <FileText className="w-4 h-4 text-[#762D46] shrink-0" />
                        <span className="truncate text-[#30232A] font-medium">{file.name}</span>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={mode === 'edit' && initialData?.id ? `/projects/${initialData.id}` : '/projects'}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E9DDE1] text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-xs transition-colors"
          >
            Cancel
          </Link>
          {!isCreatedMode && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onSaveDraft}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#E9DDE1] text-stone-700 hover:bg-[#F8EFF2] hover:text-[#762D46] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmitCreated, (errs) => scrollToFirstFormError(errs))}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              {mode === 'create' && 'Create Project'}
              {isDraftMode && 'Complete & Create Project'}
              {isCreatedMode && 'Save Changes'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
