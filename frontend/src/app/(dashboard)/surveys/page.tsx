'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Plus,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Calendar,
  Globe,
  Lock,
  FileSpreadsheet,
  FolderKanban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSurveys } from '@/features/surveys/hooks/useSurveys';
import {
  SurveyListItem,
  SurveyStatus,
  SurveyVisibility,
} from '@/features/surveys/types/survey.types';
import { projectClientService } from '@/features/projects/services/projectClientService';
import { DeleteSurveyModal } from '@/features/surveys/components/DeleteSurveyModal';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

export default function GlobalSurveysPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  const [surveyToDelete, setSurveyToDelete] = useState<SurveyListItem | null>(null);

  // Fetch organiser projects for filter dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects', 'selector'],
    queryFn: async () => {
      const res = await projectClientService.getProjects({ page_size: 100 });
      if (!res.ok || !res.data) return [];
      return res.data.results;
    },
    staleTime: 5 * 60 * 1000,
  });

  const queryFilters = {
    status: statusFilter === 'all' ? undefined : (statusFilter as SurveyStatus),
    visibility: visibilityFilter === 'all' ? undefined : (visibilityFilter as SurveyVisibility),
    project: projectFilter === 'all' ? undefined : projectFilter,
    page,
    page_size: pageSize,
  };

  const {
    data: paginatedData,
    isLoading,
    isError,
    error,
    refetch,
  } = useSurveys(queryFilters);

  const surveys = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const totalPages = paginatedData?.total_pages || 1;

  // Compute summary stats from current view
  const publishedCount = surveys.filter((s) => s.status === 'published').length;
  const totalResponses = surveys.reduce((acc, s) => acc + (s.response_count || 0), 0);

  const renderStatusBadge = (status: SurveyStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Published
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            Closed
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Draft
          </span>
        );
    }
  };

  const renderVisibilityBadge = (visibility: SurveyVisibility) => {
    if (visibility === 'public') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
          <Globe className="w-3 h-3 text-sky-600" />
          Public
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
        <Lock className="w-3 h-3 text-purple-600" />
        Private
      </span>
    );
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return 'No schedule';
    const format = (str: string) => {
      const d = new Date(str);
      return isNaN(d.getTime())
        ? str
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (start && end) return `${format(start)} – ${format(end)}`;
    if (start) return `Starts ${format(start)}`;
    return `Ends ${format(end!)}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#421827] via-[#5C2337] to-[#762D46] text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#F4E5EA] border border-white/15">
              <ClipboardList className="w-3.5 h-3.5 text-[#F4E5EA]" />
              Survey Management & Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Surveys & Audience Research
            </h1>
            <p className="text-sm text-stone-200 leading-relaxed">
              Create, configure, and monitor participant questionnaires across all your Event Projects.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/surveys/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#762D46] hover:bg-[#FBF7F8] font-semibold text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#762D46]" />
              <span>Create Survey</span>
            </Link>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#A84A63]/30 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#75666D]">Total Surveys</p>
            <p className="text-2xl font-bold text-[#30232A] mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#A84A63]" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#75666D]">Published Active</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#75666D]">Recorded Responses (Page)</p>
            <p className="text-2xl font-bold text-[#762D46] mt-1">{totalResponses}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#A84A63]" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium rounded-xl border border-stone-200 bg-white px-3 py-2 text-[#421827] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]/20 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => {
              setVisibilityFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium rounded-xl border border-stone-200 bg-white px-3 py-2 text-[#421827] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]/20 cursor-pointer"
          >
            <option value="all">All Visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>

          {/* Project Filter */}
          {projects && projects.length > 0 && (
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium rounded-xl border border-stone-200 bg-white px-3 py-2 text-[#421827] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]/20 cursor-pointer max-w-xs truncate"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="text-xs text-stone-500">
          Showing <span className="font-semibold text-stone-800">{surveys.length}</span> of{' '}
          <span className="font-semibold text-stone-800">{totalCount}</span> surveys
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-[#E9DDE1]">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-stone-500 mt-3">Loading your surveys...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Alert variant="error" title="Failed to load surveys">
          <div className="flex items-center justify-between gap-4">
            <span>{error instanceof Error ? error.message : 'Could not fetch your surveys.'}</span>
            <button
              onClick={() => refetch()}
              className="text-xs font-semibold text-rose-800 underline hover:no-underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !isError && surveys.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-12 text-center max-w-md mx-auto shadow-xs my-6">
          <div className="w-16 h-16 rounded-2xl bg-[#F4E5EA] text-[#762D46] mx-auto flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-8 h-8 text-[#A84A63]" />
          </div>
          <h3 className="text-base font-bold text-[#30232A] mb-1">
            No Surveys Found
          </h3>
          <p className="text-xs sm:text-sm text-[#75666D] leading-relaxed mb-6">
            {statusFilter !== 'all' || visibilityFilter !== 'all' || projectFilter !== 'all'
              ? 'No surveys match the selected filters. Try clearing some filters to view your surveys.'
              : 'You haven’t created any surveys yet. Create a survey to start assessing audience demand and collecting participant feedback.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {statusFilter !== 'all' || visibilityFilter !== 'all' || projectFilter !== 'all' ? (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setVisibilityFilter('all');
                  setProjectFilter('all');
                  setPage(1);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <Link
                href="/surveys/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#762D46] hover:bg-[#5C2337] text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Survey</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Surveys Table */}
      {!isLoading && !isError && surveys.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E9DDE1] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#F8EFF2] bg-[#FDFBFB] text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3.5 px-4">Survey</th>
                  <th className="py-3.5 px-4">Associated Project</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Visibility</th>
                  <th className="py-3.5 px-4 text-center">Responses</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8EFF2]">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-[#FDF9FA] transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#30232A] group-hover:text-[#762D46] transition-colors">
                        <Link href={`/surveys/${survey.id}`} className="hover:underline">
                          {survey.title}
                        </Link>
                      </div>
                      {survey.description && (
                        <p className="text-xs text-stone-500 line-clamp-1 max-w-sm mt-0.5">
                          {survey.description}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {survey.project_name ? (
                        <Link
                          href={`/projects/${survey.project}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#762D46] hover:underline"
                        >
                          <FolderKanban className="w-3.5 h-3.5 text-[#A84A63]" />
                          <span>{survey.project_name}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-stone-400">Project #{survey.project.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {renderStatusBadge(survey.status)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {renderVisibilityBadge(survey.visibility)}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="font-semibold text-xs text-[#30232A]">
                        {survey.response_count}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{formatDateRange(survey.start_date, survey.end_date)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/surveys/${survey.id}`}
                          className="p-1.5 text-stone-500 hover:text-[#762D46] hover:bg-[#F4E5EA]/60 rounded-lg transition-colors"
                          title="View Survey"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/surveys/${survey.id}/edit`}
                          className="p-1.5 text-stone-500 hover:text-[#762D46] hover:bg-[#F4E5EA]/60 rounded-lg transition-colors"
                          title="Edit Survey"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setSurveyToDelete(survey)}
                          className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Survey"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#FDFBFB] border-t border-[#F8EFF2] text-xs text-stone-600">
              <div>
                Page <strong className="font-semibold text-stone-900">{page}</strong> of{' '}
                <strong className="font-semibold text-stone-900">{totalPages}</strong> ({totalCount} total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Survey Confirmation Modal */}
      <DeleteSurveyModal
        isOpen={Boolean(surveyToDelete)}
        onClose={() => setSurveyToDelete(null)}
        survey={surveyToDelete}
      />
    </div>
  );
}
