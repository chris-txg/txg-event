'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BarChart3,
  Eye,
  ArrowLeft,
  ArrowRight,
  FolderKanban,
  Calendar,
  Globe,
  Lock,
  Search,
  Filter,
} from 'lucide-react';
import { useSurveys, useSurvey } from '@/features/surveys/hooks/useSurveys';
import { SurveyStatus, SurveyVisibility } from '@/features/surveys/types/survey.types';
import { SurveyAnalyticsSection } from '@/features/surveys/components/SurveyAnalyticsSection';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { APP_ROUTES } from '@/config/endpoints';

function AnalyticsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSurveyId = searchParams.get('surveyId');

  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(urlSurveyId);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Keep state synced with URL parameter
  useEffect(() => {
    setSelectedSurveyId(urlSurveyId);
  }, [urlSurveyId]);

  // Construct query filters: only published and closed surveys are eligible for analytics
  const queryFilters = useMemo(
    () => ({
      status: statusFilter === 'all' ? 'published,closed' : statusFilter,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      search: searchTerm.trim() || undefined,
      page: currentPage,
      page_size: pageSize,
    }),
    [statusFilter, fromDate, toDate, searchTerm, currentPage, pageSize]
  );

  // 1. Fetch user surveys with 30s TanStack client cache
  const {
    data: surveysData,
    isLoading: isLoadingSurveys,
    isError: isSurveysError,
    error: surveysError,
  } = useSurveys(queryFilters, {
    staleTime: 30 * 1000, // 30s cache retention for instant back-navigation between page sizes
  });

  const surveysList = surveysData?.results ?? [];
  const totalCount = surveysData?.count ?? 0;
  const totalPages = surveysData?.total_pages ?? 1;

  // 2. Fetch full detail of the selected survey (only when one is selected)
  const {
    data: selectedSurveyDetail,
    isLoading: isLoadingSurveyDetail,
    isError: isSurveyDetailError,
    error: surveyDetailError,
  } = useSurvey(selectedSurveyId || '');

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
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {status}
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
    if (!start && !end) return 'No schedule window';
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

  const handleSelectSurvey = (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    router.push(`/analytics?surveyId=${surveyId}`);
  };

  const handleBackToList = () => {
    setSelectedSurveyId(null);
    router.push('/analytics');
  };

  // -----------------------------------------------------------------
  // VIEW 1: Survey Analytics Detail View (Drill-down)
  // -----------------------------------------------------------------
  if (selectedSurveyId) {
    return (
      <div className="space-y-6 animate-fadeIn text-left">
        {/* Top Actions Bar */}
        <div className="flex items-center justify-start text-xs text-stone-500">
          <button
            onClick={handleBackToList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E9DDE1] text-xs font-semibold text-[#762D46] hover:bg-[#FAF5F7] transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Survey List</span>
          </button>
        </div>

        {/* Survey Analytics Content */}
        {isLoadingSurveyDetail ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Spinner size="lg" />
            <p className="text-xs font-medium text-stone-500">Loading live survey responses and analytics...</p>
          </div>
        ) : isSurveyDetailError || !selectedSurveyDetail ? (
          <div className="space-y-4 max-w-xl mx-auto py-12">
            <Alert variant="error" title="Failed to Load Survey Analytics">
              <p>{surveyDetailError instanceof Error ? surveyDetailError.message : 'Unable to retrieve this survey.'}</p>
            </Alert>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#762D46] text-white text-xs font-semibold hover:bg-[#5C2337] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Analytics List</span>
            </button>
          </div>
        ) : (
          <SurveyAnalyticsSection survey={selectedSurveyDetail} />
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------
  // VIEW 2: Primary Analytics Surveys Table List
  // -----------------------------------------------------------------
  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#421827] via-[#5C2337] to-[#762D46] text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#F4E5EA] border border-white/15">
              <BarChart3 className="w-3.5 h-3.5 text-[#F4E5EA]" />
              Audience Analytics Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Research & Survey Analytics
            </h1>
            <p className="text-sm text-stone-200 leading-relaxed">
              Inspect participant feedback, analyze question response distributions, track response timelines, and export submission records across all published and closed surveys.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={APP_ROUTES.SURVEYS}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#762D46] hover:bg-[#FBF7F8] font-semibold text-sm shadow-md transition-all cursor-pointer"
            >
              <span>Manage Surveys</span>
              <ArrowRight className="w-4 h-4 text-[#762D46]" />
            </Link>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-[#A84A63]/30 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 2. Surveys Table Card */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] shadow-xs overflow-hidden">
        {/* Table Controls Bar */}
        <div className="p-5 border-b border-[#F8EFF2] space-y-3.5">
          <h2 className="text-base font-bold text-[#30232A]">
            Surveys with Active Analytics
          </h2>

          {/* Single Horizontal Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search survey title or project..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#762D46]/20 focus:border-[#762D46] bg-stone-50/50 w-52 sm:w-64 transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-xl border border-stone-200 py-1.5 px-2.5 bg-stone-50/50 text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#762D46]/20 focus:border-[#762D46] cursor-pointer"
              >
                <option value="all">All Statuses ({totalCount})</option>
                <option value="published">Published Only</option>
                <option value="closed">Closed Only</option>
              </select>
            </div>

            {/* From Date Filter */}
            <div className={`flex items-center gap-1.5 rounded-xl border bg-stone-50/50 px-2.5 py-1 text-xs text-[#421827] ${
              fromDate && toDate && toDate < fromDate ? 'border-rose-400 bg-rose-50/20' : 'border-stone-200'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[11px] text-stone-400 font-medium">From:</span>
              <input
                type="date"
                max={toDate || undefined}
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-stone-700 focus:outline-none cursor-pointer"
              />
            </div>

            {/* To Date Filter */}
            <div className={`flex items-center gap-1.5 rounded-xl border bg-stone-50/50 px-2.5 py-1 text-xs text-[#421827] ${
              fromDate && toDate && toDate < fromDate ? 'border-rose-400 bg-rose-50/20' : 'border-stone-200'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[11px] text-stone-400 font-medium">To:</span>
              <input
                type="date"
                min={fromDate || undefined}
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-stone-700 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Reset Filters */}
            {(searchTerm || statusFilter !== 'all' || fromDate || toDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setFromDate('');
                  setToDate('');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-[#762D46] hover:underline cursor-pointer px-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoadingSurveys ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Spinner size="lg" />
            <p className="text-xs font-medium text-stone-500">Loading active surveys...</p>
          </div>
        ) : isSurveysError ? (
          <div className="p-6">
            <Alert variant="error" title="Failed to Load Surveys">
              <p>{surveysError?.message || 'Could not fetch surveys from server.'}</p>
            </Alert>
          </div>
        ) : totalCount === 0 ? (
          /* Empty Filter / Search Result */
          <div className="py-16 text-center space-y-2 p-6">
            <p className="text-sm font-semibold text-stone-700">No published or closed surveys found.</p>
            <p className="text-xs text-stone-400">
              {searchTerm || fromDate || toDate || statusFilter !== 'all'
                ? 'Try adjusting or clearing your filters to see more results.'
                : 'Response analytics require surveys in Published or Closed status.'}
            </p>
            {(searchTerm || fromDate || toDate || statusFilter !== 'all') ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setFromDate('');
                  setToDate('');
                  setCurrentPage(1);
                }}
                className="mt-2 text-xs font-semibold text-[#762D46] hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <div className="pt-2">
                <Link
                  href={APP_ROUTES.SURVEYS}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#762D46] text-white text-xs font-semibold hover:bg-[#5C2337] transition-colors"
                >
                  <span>Go to Surveys to Publish</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Clean Surveys Table matching /surveys styling */
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBF7F8] border-b border-[#F8EFF2] text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Survey</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4 text-center">Responses</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8EFF2]">
                {surveysList.map((survey) => (
                  <tr
                    key={survey.id}
                    className="hover:bg-[#FAF5F7]/50 transition-colors group cursor-pointer"
                    onClick={() => handleSelectSurvey(survey.id)}
                  >
                    {/* Survey Title & Description */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="space-y-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSurvey(survey.id);
                          }}
                          className="font-bold text-sm text-[#30232A] group-hover:text-[#762D46] transition-colors text-left truncate max-w-xs block cursor-pointer"
                        >
                          {survey.title}
                        </button>
                        {survey.description && (
                          <p className="text-stone-400 line-clamp-1 text-[11px]">
                            {survey.description}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Associated Project */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {survey.project_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F4E5EA] text-[#762D46]">
                          <FolderKanban className="w-3 h-3 text-[#A84A63]" />
                          <span className="truncate max-w-[140px]">{survey.project_name}</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">Standalone</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {renderStatusBadge(survey.status)}
                    </td>

                    {/* Visibility Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {renderVisibilityBadge(survey.visibility)}
                    </td>

                    {/* Recorded Responses Count */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs bg-[#F4E5EA] text-[#762D46]">
                        {survey.response_count ?? 0}
                      </span>
                    </td>

                    {/* Schedule Dates */}
                    <td className="py-4 px-4 whitespace-nowrap text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{formatDateRange(survey.start_date, survey.end_date)}</span>
                      </div>
                    </td>

                    {/* Action Column: ONLY View Icon */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSurvey(survey.id);
                          }}
                          className="p-2 text-[#762D46] hover:bg-[#F4E5EA] rounded-xl transition-all shadow-xs border border-[#E9DDE1]/60 cursor-pointer"
                          title="View Analytics"
                        >
                          <Eye className="w-4 h-4" />
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
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
              }}
              isLoading={isLoadingSurveys}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-xs font-medium text-stone-500">Loading analytics dashboard...</p>
        </div>
      }
    >
      <AnalyticsDashboardContent />
    </Suspense>
  );
}
