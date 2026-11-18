'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
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

  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [localSubmitError, setLocalSubmitError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const initialServices =
    initialData?.required_services && initialData.required_services.length > 0
      ? initialData.required_services
      : ['Research', 'Audience Surveys'];

  const [selectedServices, setSelectedServices] = useState<string[]>(initialServices);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
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
      currency: initialData?.currency || 'USD',
      required_services: initialServices,
      research_objective: initialData?.research_objective ?? '',
      research_start_date: initialData?.research_start_date ?? '',
      research_end_date: initialData?.research_end_date ?? '',
    },
  });

  const blockedExtensions = [
    'exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'dll', 'js', 'vbs', 'php'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    for (const f of newFiles) {
      if (f.size > 10 * 1024 * 1024) {
        setFileError(`File "${f.name}" exceeds 10MB limit.`);
        return;
      }
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (blockedExtensions.includes(ext)) {
        setFileError(`File extension ".${ext}" is not permitted for security reasons.`);
        return;
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleServiceToggle = (svc: string) => {
    const updated = selectedServices.includes(svc)
      ? selectedServices.filter((s) => s !== svc)
      : [...selectedServices, svc];
    setSelectedServices(updated);
    setValue('required_services', updated);
  };

  const buildFormData = (data: ProjectFormData, targetStatus: 'draft' | 'created'): FormData => {
    const formData = new FormData();
    formData.append('status', targetStatus);

    Object.entries(data).forEach(([key, val]) => {
      if (key === 'status') return;
      if (key === 'required_services') {
        formData.append('required_services', JSON.stringify(selectedServices));
        return;
      }
      if (val !== undefined && val !== null && val !== '') {
        formData.append(key, String(val));
      }
    });

    files.forEach((file) => {
      formData.append('supporting_documents', file);
    });

    return formData;
  };

  const onSaveDraft = async () => {
    setLocalSubmitError(null);
    const data = getValues();
    if (!data.project_name || data.project_name.trim() === '') {
      setLocalSubmitError('Project Name is required to save a draft.');
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
            onClick={handleSubmit(onSubmitCreated)}
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

      <form onSubmit={handleSubmit(onSubmitCreated)} className="space-y-8">
        {/* Section 1: Project Identity & Scope */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <FolderKanban className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">1. Project Identity & Scope</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A] flex items-center justify-between">
                <span>Project Name <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                placeholder="e.g. Asia-Pacific Tech Expo 2026"
                {...register('project_name')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.project_name && (
                <p className="text-[11px] text-red-600">{errors.project_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Segment {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. B2B Corporate / Technology"
                {...register('event_segment')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.event_segment && (
                <p className="text-[11px] text-red-600">{errors.event_segment.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Category {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. Conference, Exhibition, Summit"
                {...register('event_category')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.event_category && (
                <p className="text-[11px] text-red-600">{errors.event_category.message}</p>
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
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Format {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <select
                {...register('event_format')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              >
                <option value="">Select event format</option>
                <option value="Physical / In-Person">Physical / In-Person</option>
                <option value="Virtual / Online">Virtual / Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
              {errors.event_format && (
                <p className="text-[11px] text-red-600">{errors.event_format.message}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Project Description {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder="Provide a comprehensive summary of this event project..."
                {...register('project_description')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.project_description && (
                <p className="text-[11px] text-red-600">{errors.project_description.message}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event Objective {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={2}
                placeholder="What primary goal or milestone should this event achieve?"
                {...register('event_objective')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.event_objective && (
                <p className="text-[11px] text-red-600">{errors.event_objective.message}</p>
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
                Organiser Name / Entity {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="Company / Organization Name"
                {...register('organiser_name')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.organiser_name && (
                <p className="text-[11px] text-red-600">{errors.organiser_name.message}</p>
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
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Official Email {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <input
                type="email"
                placeholder="contact@organisation.com"
                {...register('official_email')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.official_email && (
                <p className="text-[11px] text-red-600">{errors.official_email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Contact Number <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                {...register('contact_number')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
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
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
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
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
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
                Event Country {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. Singapore"
                {...register('event_country')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.event_country && (
                <p className="text-[11px] text-red-600">{errors.event_country.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Event City {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. Singapore"
                {...register('event_city')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.event_city && (
                <p className="text-[11px] text-red-600">{errors.event_city.message}</p>
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
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
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
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Proposed Event Date <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                {...register('proposed_date')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Duration <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 3 Days"
                {...register('duration')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Expected Attendance <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 1500"
                {...register('expected_attendance')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Target Audience <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Describe key demographic, industry profiles, or attendee criteria..."
                {...register('target_audience')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
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
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#30232A]">
                Estimated Budget Range <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. $50,000 - $100,000"
                {...register('estimated_budget_range')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
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
                Research Objective {!isDraftMode && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder="Specify the market research, attendee preferences, or survey goals for this initiative..."
                {...register('research_objective')}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
              />
              {errors.research_objective && (
                <p className="text-[11px] text-red-600">{errors.research_objective.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#30232A]">
                  Research Window Start Date <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  {...register('research_start_date')}
                  className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#30232A]">
                  Research Window End Date <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  {...register('research_end_date')}
                  className="w-full px-3.5 py-2.5 bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl text-xs sm:text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:bg-white transition-all"
                />
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

              {fileError && <p className="text-[11px] text-red-600 mt-1">{fileError}</p>}
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
            onClick={handleSubmit(onSubmitCreated)}
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
