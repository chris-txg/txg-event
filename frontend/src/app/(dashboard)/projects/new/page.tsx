'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  projectFormSchema,
  ProjectFormData,
} from '@/features/projects/schemas/project.schema';
import { projectClientService } from '@/features/projects/services/projectClientService';
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
  Mail,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Research',
    'Audience Surveys',
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      status: 'created',
      project_name: '',
      event_segment: '',
      event_category: '',
      event_subcategory: '',
      project_description: '',
      event_objective: '',
      organiser_name: '',
      designation: '',
      official_email: '',
      contact_number: '',
      organiser_country: '',
      organiser_region: '',
      event_country: '',
      event_state: '',
      event_city: '',
      event_locality: '',
      event_format: '',
      proposed_date: '',
      duration: '',
      expected_attendance: '',
      target_audience: '',
      estimated_budget_range: '',
      currency: 'USD',
      required_services: ['Research', 'Audience Surveys'],
      research_objective: '',
      research_start_date: '',
      research_end_date: '',
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

  const processSubmission = async (data: ProjectFormData, targetStatus: 'draft' | 'created') => {
    setSubmitError(null);
    setIsSubmittingForm(true);

    try {
      const formData = new FormData();
      formData.append('status', targetStatus);

      // Append standard text fields
      Object.entries(data).forEach(([key, val]) => {
        if (key === 'status') return;
        if (key === 'required_services') {
          selectedServices.forEach((svc) => formData.append('required_services', svc));
          return;
        }
        if (val !== undefined && val !== null && val !== '') {
          formData.append(key, String(val));
        }
      });

      // Append files
      files.forEach((file) => {
        formData.append('supporting_documents', file);
      });

      const res = await projectClientService.createProject(formData);

      if (!res.ok) {
        let msg = 'Failed to create project.';
        if (typeof res.error === 'object' && res.error !== null) {
          const errObj = res.error as Record<string, unknown>;
          if (errObj.detail && typeof errObj.detail === 'string') {
            msg = errObj.detail;
          } else {
            msg = Object.entries(errObj)
              .map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : m}`)
              .join(' | ');
          }
        }
        setSubmitError(msg);
        setIsSubmittingForm(false);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error. Please try again.');
      setIsSubmittingForm(false);
    }
  };

  const onSaveDraft = () => {
    const data = watch();
    if (!data.project_name || data.project_name.trim() === '') {
      setSubmitError('Project Name is required to save a draft.');
      return;
    }
    processSubmission(data, 'draft');
  };

  const onSubmitCreated = (data: ProjectFormData) => {
    processSubmission(data, 'created');
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9DDE1]">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="w-9 h-9 rounded-xl bg-white border border-[#E9DDE1] text-stone-600 hover:text-[#762D46] hover:border-[#762D46] flex items-center justify-center transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F4E5EA] text-[#762D46] mb-1">
              <Sparkles className="w-3 h-3 text-[#A84A63]" />
              New Initiative
            </div>
            <h1 className="text-2xl font-bold text-[#30232A]">Create New Project</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSubmittingForm}
            onClick={onSaveDraft}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E9DDE1] text-stone-700 hover:bg-[#F8EFF2] hover:text-[#762D46] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save as Draft</span>
          </button>
          <button
            type="button"
            disabled={isSubmittingForm}
            onClick={handleSubmit(onSubmitCreated)}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmittingForm ? <Spinner size="sm" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold block mb-0.5">Validation / Submission Error</span>
            {submitError}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmitCreated)} className="space-y-8" noValidate>
        {/* Section 1: Core Project Overview */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <FolderKanban className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">1. Project Identity & Scope</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('project_name')}
                placeholder="e.g. Global Tech Summit 2027"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]"
              />
              {errors.project_name && (
                <p className="text-xs text-red-600 mt-1">{errors.project_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event Segment <span className="text-red-500">*</span>
              </label>
              <input
                {...register('event_segment')}
                placeholder="e.g. B2B Corporate / Technology"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]"
              />
              {errors.event_segment && (
                <p className="text-xs text-red-600 mt-1">{errors.event_segment.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event Category <span className="text-red-500">*</span>
              </label>
              <input
                {...register('event_category')}
                placeholder="e.g. Conference, Exhibition, Summit"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]"
              />
              {errors.event_category && (
                <p className="text-xs text-red-600 mt-1">{errors.event_category.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event Subcategory <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('event_subcategory')}
                placeholder="e.g. AI & Cloud Infrastructure"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event Format <span className="text-red-500">*</span>
              </label>
              <select
                {...register('event_format')}
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              >
                <option value="">Select event format</option>
                <option value="Physical">In-Person / Physical</option>
                <option value="Virtual">Virtual / Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
              {errors.event_format && (
                <p className="text-xs text-red-600 mt-1">{errors.event_format.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                {...register('project_description')}
                placeholder="Provide a comprehensive summary of this event project..."
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]"
              />
              {errors.project_description && (
                <p className="text-xs text-red-600 mt-1">{errors.project_description.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event Objective <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                {...register('event_objective')}
                placeholder="What primary goal or milestone should this event achieve?"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]"
              />
              {errors.event_objective && (
                <p className="text-xs text-red-600 mt-1">{errors.event_objective.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Organiser & Contact Information */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <Building className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">2. Organiser & Point of Contact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Organiser Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('organiser_name')}
                placeholder="Company / Organization Name"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]"
              />
              {errors.organiser_name && (
                <p className="text-xs text-red-600 mt-1">{errors.organiser_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Designation <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('designation')}
                placeholder="e.g. Lead Event Director"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Official Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('official_email')}
                placeholder="contact@enterprise.com"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
              {errors.official_email && (
                <p className="text-xs text-red-600 mt-1">{errors.official_email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Contact Number <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('contact_number')}
                placeholder="+1 555-0199"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Organiser Country <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('organiser_country')}
                placeholder="e.g. United Kingdom"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Organiser Region <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('organiser_region')}
                placeholder="e.g. EMEA / London HQ"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Event Location & Schedule */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <MapPin className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">3. Event Location & Scheduling</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event Country <span className="text-red-500">*</span>
              </label>
              <input
                {...register('event_country')}
                placeholder="e.g. United States"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
              {errors.event_country && (
                <p className="text-xs text-red-600 mt-1">{errors.event_country.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event City <span className="text-red-500">*</span>
              </label>
              <input
                {...register('event_city')}
                placeholder="e.g. San Francisco"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
              {errors.event_city && (
                <p className="text-xs text-red-600 mt-1">{errors.event_city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event State / Province <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('event_state')}
                placeholder="e.g. California"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Event Locality / Venue <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('event_locality')}
                placeholder="e.g. Moscone Convention Center"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Proposed Date <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                {...register('proposed_date')}
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Duration <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('duration')}
                placeholder="e.g. 3 Days, 9:00 AM - 5:00 PM"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Audience & Budget Parameters */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <Calendar className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">4. Audience & Financial Estimates</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Expected Attendance <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                {...register('expected_attendance')}
                placeholder="e.g. 1500"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Target Audience <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('target_audience')}
                placeholder="e.g. CTOs, Engineering Leads, Researchers"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Estimated Budget Range <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('estimated_budget_range')}
                placeholder="e.g. 100,000 - 250,000"
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Currency <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <select
                {...register('currency')}
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="LKR">LKR (Rs)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="AED">AED (AED)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Research & Service Scope */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <Sparkles className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">5. Research Objectives & Timeline</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-1">
                Research Objective <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                {...register('research_objective')}
                placeholder="Describe the research goals (e.g. attendee interest validation, ticket price sensitivity, speaker topic demand)..."
                className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]"
              />
              {errors.research_objective && (
                <p className="text-xs text-red-600 mt-1">{errors.research_objective.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#30232A] mb-1">
                  Research Start Date <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  {...register('research_start_date')}
                  className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#30232A] mb-1">
                  Research End Date <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  {...register('research_end_date')}
                  className="w-full px-3.5 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] focus:outline-none focus:border-[#762D46]"
                />
                {errors.research_end_date && (
                  <p className="text-xs text-red-600 mt-1">{errors.research_end_date.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30232A] mb-2">
                Required Services Included
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Research',
                  'Audience Surveys',
                  'Venue Analysis',
                  'Sponsorship Viability',
                  'Competitor Benchmarking',
                ].map((serviceName) => {
                  const isChecked = selectedServices.includes(serviceName);
                  return (
                    <button
                      key={serviceName}
                      type="button"
                      onClick={() => handleServiceToggle(serviceName)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-[#F4E5EA] border-[#762D46] text-[#762D46]'
                          : 'bg-[#FBF7F8] border-[#E9DDE1] text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {serviceName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Supporting Documents */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#F8EFF2]">
            <Upload className="w-5 h-5 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">6. Supporting Documents</h2>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-[#E9DDE1] hover:border-[#762D46] rounded-xl p-8 text-center bg-[#FBF7F8] transition-colors cursor-pointer relative">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-[#A84A63] mb-2" />
                <p className="text-sm font-semibold text-[#30232A]">
                  Click to select files or drag and drop
                </p>
                <p className="text-xs text-[#75666D] mt-1">
                  PDF, DOCX, XLSX, PNG, JPG (Max 10MB per file). Executable scripts blocked.
                </p>
              </div>
            </div>

            {fileError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fileError}
              </p>
            )}

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#30232A]">
                  Attached Files ({files.length}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-[#762D46] shrink-0" />
                        <span className="truncate font-medium text-stone-800">{file.name}</span>
                        <span className="text-stone-400 shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded transition-colors"
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
            href="/projects"
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E9DDE1] text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-xs transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={isSubmittingForm}
            onClick={onSaveDraft}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E9DDE1] text-stone-700 hover:bg-[#F8EFF2] hover:text-[#762D46] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={isSubmittingForm}
            onClick={handleSubmit(onSubmitCreated)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmittingForm ? <Spinner size="sm" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Create Project</span>
          </button>
        </div>
      </form>
    </div>
  );
}
