'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { projectClientService } from '@/features/projects/services/projectClientService';
import {
  FolderKanban,
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Building,
  Mail,
  Phone,
  Globe,
  FileText,
  Download,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Info,
  Layers,
  PieChart,
  BarChart3,
  Users,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export default function ProjectWorkspacePage() {
  const params = useParams();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<string>('project-details');

  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await projectClientService.getProjectById(id);
      if (!res.ok) {
        throw new Error(
          typeof res.error === 'object' && res.error && 'detail' in res.error
            ? String((res.error as { detail: unknown }).detail)
            : 'Failed to load project details'
        );
      }
      return res.data;
    },
    enabled: !!id,
  });

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'project-details', label: 'Project Details' },
    { id: 'audience-segments', label: 'Audience Segments' },
    { id: 'research-activities', label: 'Research Activities' },
    { id: 'surveys', label: 'Surveys' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'feasibility-report', label: 'Feasibility Report' },
  ];

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-[#75666D] mt-3">Loading project workspace...</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-base font-bold text-red-900">Project Not Found</h3>
        <p className="text-xs text-red-700 mt-1">
          {error instanceof Error ? error.message : 'Unable to find or view this project.'}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
          <Link
            href="/projects"
            className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Navigation & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9DDE1]">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="w-9 h-9 rounded-xl bg-white border border-[#E9DDE1] text-stone-600 hover:text-[#762D46] hover:border-[#762D46] flex items-center justify-center transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-[#75666D]">
                {project.event_segment || 'General'} &bull; {project.event_category || 'Event'}
              </span>
              {project.status === 'draft' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Draft
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Created
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#30232A] tracking-tight">
              {project.project_name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#75666D]">
          <span>Created on {new Date(project.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* 7 Tab Navigation Bar */}
      <div className="border-b border-[#E9DDE1] flex overflow-x-auto scrollbar-none gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#762D46] text-[#762D46] bg-[#F4E5EA]/40'
                  : 'border-transparent text-stone-600 hover:text-[#762D46] hover:border-stone-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview (Empty per requirements) */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-12 text-center max-w-md mx-auto shadow-xs my-8">
          <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
            <Info className="w-6 h-6 text-stone-400" />
          </div>
          <h3 className="text-sm font-bold text-[#30232A] mb-1">Overview Workspace</h3>
          <p className="text-xs text-[#75666D]">
            This overview container is currently empty. Switch to the <strong>Project Details</strong> tab to inspect saved specifications and documents.
          </p>
        </div>
      )}

      {/* Tab 2: Project Details (Fully functional per requirements) */}
      {activeTab === 'project-details' && (
        <div className="space-y-6">
          {/* Identity & Scope */}
          <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F8EFF2]">
              <FolderKanban className="w-4 h-4 text-[#762D46]" />
              <h3 className="text-sm font-bold text-[#30232A]">Event Scope & Narrative</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[#75666D] font-medium">Project Name</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.project_name}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Event Segment</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.event_segment || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Event Category</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.event_category || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Event Subcategory</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.event_subcategory || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Format</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.event_format || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Status</p>
                <p className="font-semibold text-[#30232A] mt-0.5 capitalize">{project.status}</p>
              </div>
            </div>

            {project.project_description && (
              <div className="pt-2">
                <p className="text-[#75666D] text-xs font-medium">Description</p>
                <p className="text-xs text-[#30232A] leading-relaxed mt-1 bg-[#FBF7F8] p-3 rounded-xl border border-[#E9DDE1]">
                  {project.project_description}
                </p>
              </div>
            )}

            {project.event_objective && (
              <div className="pt-2">
                <p className="text-[#75666D] text-xs font-medium">Event Objective</p>
                <p className="text-xs text-[#30232A] leading-relaxed mt-1 bg-[#FBF7F8] p-3 rounded-xl border border-[#E9DDE1]">
                  {project.event_objective}
                </p>
              </div>
            )}
          </div>

          {/* Organiser Information */}
          <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F8EFF2]">
              <Building className="w-4 h-4 text-[#762D46]" />
              <h3 className="text-sm font-bold text-[#30232A]">Organiser & Representation</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[#75666D] font-medium">Organiser Name</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.organiser_name || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Designation</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.designation || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Official Email</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.official_email || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Contact Number</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.contact_number || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Organiser Country</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.organiser_country || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Organiser Region</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.organiser_region || '—'}</p>
              </div>
            </div>
          </div>

          {/* Location & Scheduling */}
          <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F8EFF2]">
              <MapPin className="w-4 h-4 text-[#762D46]" />
              <h3 className="text-sm font-bold text-[#30232A]">Venue & Schedule</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[#75666D] font-medium">Country</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.event_country || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">City</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.event_city || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">State / Region</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.event_state || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Locality / Address</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.event_locality || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Proposed Date</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.proposed_date || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Duration</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.duration || '—'}</p>
              </div>
            </div>
          </div>

          {/* Research & Attendance Parameters */}
          <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F8EFF2]">
              <Calendar className="w-4 h-4 text-[#762D46]" />
              <h3 className="text-sm font-bold text-[#30232A]">Audience, Financials & Research</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[#75666D] font-medium">Expected Attendance</p>
                <p className="font-semibold text-[#30232A] mt-0.5">
                  {project.expected_attendance ? project.expected_attendance.toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Target Audience</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.target_audience || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Estimated Budget</p>
                <p className="font-semibold text-[#30232A] mt-0.5">
                  {project.estimated_budget_range
                    ? `${project.currency || 'USD'} ${project.estimated_budget_range}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Research Start Date</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.research_start_date || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Research End Date</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.research_end_date || '—'}</p>
              </div>
              <div>
                <p className="text-[#75666D] font-medium">Associated Surveys</p>
                <p className="font-semibold text-[#30232A] mt-0.5">{project.survey_count ?? 0}</p>
              </div>
            </div>

            {project.research_objective && (
              <div className="pt-2">
                <p className="text-[#75666D] text-xs font-medium">Research Objective</p>
                <p className="text-xs text-[#30232A] leading-relaxed mt-1 bg-[#FBF7F8] p-3 rounded-xl border border-[#E9DDE1]">
                  {project.research_objective}
                </p>
              </div>
            )}

            {project.required_services && project.required_services.length > 0 && (
              <div className="pt-2">
                <p className="text-[#75666D] text-xs font-medium mb-1.5">Required Services</p>
                <div className="flex flex-wrap gap-2">
                  {project.required_services.map((svc, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-[#F4E5EA] text-[#762D46] rounded-md text-xs font-medium border border-[#E9DDE1]"
                    >
                      {svc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Supporting Documents */}
          <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F8EFF2]">
              <FileCheck className="w-4 h-4 text-[#762D46]" />
              <h3 className="text-sm font-bold text-[#30232A]">
                Supporting Documents ({project.documents?.length || 0})
              </h3>
            </div>

            {project.documents && project.documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {project.documents.map((doc) => (
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

                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[#762D46] hover:bg-[#F4E5EA] rounded-md transition-colors shrink-0"
                      title="Download or view file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#75666D] py-3 italic">
                No supporting documents were uploaded for this project.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Placeholder Tabs (3 to 7) */}
      {['audience-segments', 'research-activities', 'surveys', 'analytics', 'feasibility-report'].includes(
        activeTab
      ) && (
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-12 text-center max-w-md mx-auto shadow-xs my-8">
          <div className="w-12 h-12 rounded-xl bg-[#F4E5EA] text-[#762D46] mx-auto flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-[#A84A63]" />
          </div>
          <h3 className="text-base font-bold text-[#30232A] mb-1 capitalize">
            {activeTab.replace('-', ' ')}
          </h3>
          <p className="text-xs text-[#75666D] leading-relaxed">
            This workspace section is reserved for future integration. Use the <strong>Project Details</strong> tab to view and manage specifications.
          </p>
        </div>
      )}
    </div>
  );
}
