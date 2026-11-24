'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Eye,
  Trash2,
  Calendar,
  Globe,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';
import { useProjectSurveys } from '@/features/surveys/hooks/useSurveys';
import { SurveyListItem, SurveyStatus, SurveyVisibility } from '@/features/surveys/types/survey.types';
import { DeleteSurveyModal } from '@/features/surveys/components/DeleteSurveyModal';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

export interface ProjectSurveysTabProps {
  projectId: string;
  projectName?: string | null;
}

export function ProjectSurveysTab({ projectId, projectName }: ProjectSurveysTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [surveyToDelete, setSurveyToDelete] = useState<SurveyListItem | null>(null);

  const {
    data: paginatedData,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectSurveys(projectId, page, pageSize, {
    staleTime: 30 * 1000,
  });

  const surveys = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const totalPages = paginatedData?.total_pages || 1;

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
    if (!start && !end) return 'No schedule set';
    const format = (str: string) => {
      const d = new Date(str);
      return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (start && end) return `${format(start)} – ${format(end)}`;
    if (start) return `Starts: ${format(start)}`;
    return `Ends: ${format(end!)}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Title and Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9DDE1]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#30232A]">Project Surveys</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F4E5EA] text-[#762D46]">
              {totalCount} {totalCount === 1 ? 'Survey' : 'Surveys'}
            </span>
          </div>
          <p className="text-xs text-[#75666D] mt-0.5">
            Audience intelligence and questionnaire campaigns linked to this project workspace.
          </p>
        </div>

        <Link
          href={`/surveys/new?project=${projectId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#762D46] hover:bg-[#5C2337] text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Survey in Project</span>
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center">
          <Spinner size="md" />
          <p className="text-xs font-medium text-stone-500 mt-2">Loading project surveys...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Alert variant="error" title="Failed to load project surveys">
          <div className="flex items-center justify-between gap-4">
            <span>{error instanceof Error ? error.message : 'Could not fetch surveys for this project.'}</span>
            <button
              onClick={() => refetch()}
              className="text-xs font-semibold text-rose-800 underline hover:no-underline cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !isError && surveys.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-12 text-center max-w-lg mx-auto shadow-xs my-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F4E5EA] text-[#762D46] mx-auto flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-7 h-7 text-[#A84A63]" />
          </div>
          <h4 className="text-base font-bold text-[#30232A] mb-1">
            No Surveys in this Project Yet
          </h4>
          <p className="text-xs sm:text-sm text-[#75666D] leading-relaxed mb-6">
            Create structured questionnaires to test audience readiness, survey ticket tier demand, or gather attendee expectations for {projectName || 'this event'}.
          </p>
          <Link
            href={`/surveys/new?project=${projectId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#762D46] hover:bg-[#5C2337] text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Survey</span>
          </Link>
        </div>
      )}

      {/* Survey List Table / Cards */}
      {!isLoading && !isError && surveys.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E9DDE1] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#F8EFF2] bg-[#FDFBFB] text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">Survey</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4 text-center">Responses</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8EFF2]">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-[#FDF9FA] transition-colors group">
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(survey.status)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderVisibilityBadge(survey.visibility)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="font-semibold text-xs text-[#30232A]">
                        {survey.response_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{formatDateRange(survey.start_date, survey.end_date)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/surveys/${survey.id}`}
                          className="p-1.5 text-stone-500 hover:text-[#762D46] hover:bg-[#F4E5EA]/60 rounded-lg transition-colors"
                          title="View Survey"
                        >
                          <Eye className="w-4 h-4" />
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

          {/* Centralized Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            isLoading={isLoading}
          />
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
