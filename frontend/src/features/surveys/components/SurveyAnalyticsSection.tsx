'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Hash,
  MessageSquare,
  HelpCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Inbox,
  User,
  Globe,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  SurveyDetail,
  QuestionAnalyticsItem,
  SurveyResponseDetail,
  AnswerDetail,
} from '@/features/surveys/types/survey.types';
import {
  useSurveyAnalytics,
  useSurveyResponses,
} from '@/features/surveys/hooks/useSurveys';

export interface SurveyAnalyticsSectionProps {
  survey: SurveyDetail;
  onCopyShareLink?: () => void;
}

export function SurveyAnalyticsSection({ survey, onCopyShareLink }: SurveyAnalyticsSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'responses'>('analytics');
  const [page, setPage] = useState(1);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);

  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    isError: isAnalyticsError,
    error: analyticsError,
    refetch: refetchAnalytics,
    isFetching: isFetchingAnalytics,
  } = useSurveyAnalytics(survey.id);

  const {
    data: responsesData,
    isLoading: isLoadingResponses,
    isError: isResponsesError,
    error: responsesError,
    refetch: refetchResponses,
    isFetching: isFetchingResponses,
  } = useSurveyResponses(survey.id, page, {
    enabled: activeSubTab === 'responses',
  });

  const totalResponses = analytics?.total_responses ?? survey.response_count ?? 0;
  const questionsList = analytics?.questions ?? [];

  const handleRefresh = () => {
    if (activeSubTab === 'analytics') {
      refetchAnalytics();
    } else {
      refetchResponses();
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return isNaN(d.getTime())
      ? isoString
      : d.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const formatAnswerValue = (val: unknown) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F8EFF2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F4E5EA] text-[#762D46] flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-[#762D46]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#30232A]">Analytics & Response Insights</h2>
            <p className="text-xs text-stone-500">
              Aggregated question distributions and respondent answer logs
            </p>
          </div>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'analytics'
                  ? 'bg-white text-[#762D46] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Aggregated Metrics
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('responses')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'responses'
                  ? 'bg-white text-[#762D46] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Submissions ({totalResponses})
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetchingAnalytics || isFetchingResponses}
            className="p-2 rounded-xl text-stone-500 hover:text-[#762D46] hover:bg-[#F4E5EA] transition-colors border border-stone-200 cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isFetchingAnalytics || isFetchingResponses ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* High-Level Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-[#FAF3F5] border border-[#E9DDE1] space-y-1">
          <div className="flex items-center justify-between text-[#762D46]">
            <span className="font-semibold text-xs">Total Submissions</span>
            <Users className="w-4 h-4 text-[#A84A63]" />
          </div>
          <p className="text-2xl font-black text-[#30232A]">{totalResponses}</p>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
          <div className="flex items-center justify-between text-stone-600">
            <span className="font-semibold text-xs">Survey Status</span>
            <Calendar className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-sm font-bold text-[#30232A] capitalize">
            {survey.status}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
          <div className="flex items-center justify-between text-stone-600">
            <span className="font-semibold text-xs">Questions</span>
            <HelpCircle className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-2xl font-black text-[#30232A]">
            {survey.questions ? survey.questions.length : questionsList.length}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
          <div className="flex items-center justify-between text-stone-600">
            <span className="font-semibold text-xs">Access Mode</span>
            <Globe className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-sm font-bold text-[#30232A] capitalize">
            {survey.visibility} ({survey.allow_anonymous ? 'Anonymous' : 'Identified'})
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'analytics' ? (
        /* ================= Aggregated Analytics View ================= */
        <div className="space-y-6">
          {isLoadingAnalytics ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Spinner size="md" />
              <p className="text-xs text-stone-500">Calculating question distributions...</p>
            </div>
          ) : isAnalyticsError ? (
            <Alert variant="error" title="Failed to Load Analytics">
              <p>
                {analyticsError instanceof Error
                  ? analyticsError.message
                  : 'An error occurred while fetching question analytics.'}
              </p>
            </Alert>
          ) : totalResponses === 0 ? (
            /* Empty State: Zero Responses Recorded */
            <div className="p-10 rounded-2xl bg-stone-50/80 border border-dashed border-stone-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F4E5EA] text-[#762D46] mx-auto flex items-center justify-center">
                <Inbox className="w-6 h-6 text-[#762D46]" />
              </div>
              <h3 className="text-sm font-bold text-[#30232A]">No Responses Recorded Yet</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                As soon as respondents begin submitting answers through your live survey link,
                aggregated distribution charts, averages, and feedback samples will appear here in
                real time.
              </p>
              {onCopyShareLink && (
                <Button
                  onClick={onCopyShareLink}
                  variant="outline"
                  className="text-xs text-[#762D46] border-[#762D46]/30 hover:bg-[#F4E5EA] mt-2"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Copy Share Link
                </Button>
              )}
            </div>
          ) : questionsList.length === 0 ? (
            <p className="text-xs text-stone-500 italic text-center py-6">
              No questions found in this survey.
            </p>
          ) : (
            /* List of Analyzed Questions */
            <div className="space-y-4">
              {questionsList.map((q: QuestionAnalyticsItem, idx: number) => {
                const answered = q.answered_count ?? q.total_answers ?? 0;
                const distribution = q.distribution || q.choices || [];
                const summary = q.summary || q.numeric_stats;
                const samples = q.recent_samples || q.sample_responses || [];

                return (
                  <div
                    key={q.question_id || idx}
                    className="p-5 rounded-xl border border-stone-200 bg-white space-y-4 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-[#30232A]">{q.text}</h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 uppercase tracking-wide">
                          {q.question_type}
                        </span>
                        <span className="text-xs text-stone-500">
                          {answered} {answered === 1 ? 'answer' : 'answers'}
                        </span>
                      </div>
                    </div>

                    {/* Question Specific Breakdown */}
                    {['single', 'multiple', 'boolean'].includes(q.question_type) && (
                      <div className="space-y-2 pt-2">
                        {distribution.length > 0 ? (
                          distribution.map((item, cIdx) => {
                            const label = item.text || item.option || `Choice ${cIdx + 1}`;
                            const pct = Math.round(item.percentage || 0);

                            return (
                              <div key={cIdx} className="space-y-1 text-xs">
                                <div className="flex items-center justify-between font-medium">
                                  <span className="text-stone-800">{label}</span>
                                  <span className="text-stone-500 font-mono">
                                    {item.count} ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#762D46] transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-stone-400 italic">No answers recorded yet for this question.</p>
                        )}
                      </div>
                    )}

                    {q.question_type === 'number' && summary && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                        <div className="p-3 rounded-lg bg-stone-50 border border-stone-100 text-center">
                          <span className="text-stone-500 text-[11px]">Average</span>
                          <p className="text-base font-bold text-[#762D46]">
                            {summary.avg !== null && summary.avg !== undefined
                              ? summary.avg
                              : summary.average ?? '—'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-stone-50 border border-stone-100 text-center">
                          <span className="text-stone-500 text-[11px]">Median</span>
                          <p className="text-base font-bold text-[#30232A]">
                            {summary.median !== null && summary.median !== undefined ? summary.median : '—'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-stone-50 border border-stone-100 text-center">
                          <span className="text-stone-500 text-[11px]">Minimum</span>
                          <p className="text-base font-bold text-stone-700">
                            {summary.min !== null && summary.min !== undefined ? summary.min : '—'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-stone-50 border border-stone-100 text-center">
                          <span className="text-stone-500 text-[11px]">Maximum</span>
                          <p className="text-base font-bold text-stone-700">
                            {summary.max !== null && summary.max !== undefined ? summary.max : '—'}
                          </p>
                        </div>
                      </div>
                    )}

                    {['text', 'date'].includes(q.question_type) && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                          Recent Submissions ({samples.length})
                        </span>
                        {samples.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {samples.map((sample, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 text-xs text-stone-800 leading-relaxed"
                              >
                                {sample}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 italic">No text submissions recorded yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= Individual Submissions View ================= */
        <div className="space-y-4">
          {isLoadingResponses ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Spinner size="md" />
              <p className="text-xs text-stone-500">Loading respondent submissions...</p>
            </div>
          ) : isResponsesError ? (
            <Alert variant="error" title="Failed to Load Submissions">
              <p>
                {responsesError instanceof Error
                  ? responsesError.message
                  : 'An error occurred while fetching recorded submissions.'}
              </p>
            </Alert>
          ) : !responsesData || responsesData.results.length === 0 ? (
            <div className="p-10 rounded-2xl bg-stone-50/80 border border-dashed border-stone-300 text-center space-y-2">
              <p className="text-sm font-bold text-[#30232A]">No Submissions Yet</p>
              <p className="text-xs text-stone-500">
                Submissions will be listed here as participants complete the questionnaire.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 pb-1">
                <span>
                  Showing {responsesData.results.length} of {responsesData.count} submissions
                </span>
                <span>Page {page}</span>
              </div>

              {responsesData.results.map((resp: SurveyResponseDetail) => {
                const isExpanded = expandedResponseId === resp.id;

                return (
                  <div
                    key={resp.id}
                    className="border border-stone-200 rounded-xl overflow-hidden transition-all bg-white"
                  >
                    <div
                      onClick={() => setExpandedResponseId(isExpanded ? null : resp.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F4E5EA] text-[#762D46] flex items-center justify-center text-xs font-bold shrink-0">
                          <User className="w-4 h-4 text-[#762D46]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#30232A]">
                            {resp.respondent || 'Anonymous Participant'}
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Submitted on {formatDate(resp.submitted_at)}
                            {resp.respondent_ip ? ` • IP: ${resp.respondent_ip}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {resp.answers ? resp.answers.length : 0} Answers
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-stone-50/70 border-t border-stone-100 space-y-3 text-xs">
                        {resp.answers && resp.answers.length > 0 ? (
                          resp.answers.map((ans: AnswerDetail, aIdx: number) => (
                            <div
                              key={ans.id || aIdx}
                              className="p-3 rounded-lg bg-white border border-stone-200 space-y-1"
                            >
                              <span className="font-semibold text-stone-700 block">
                                {aIdx + 1}. {ans.question_text || `Question ${aIdx + 1}`}
                              </span>
                              <p className="text-stone-900 font-medium whitespace-pre-wrap pl-2 border-l-2 border-[#762D46]">
                                {formatAnswerValue(ans.value)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-stone-400 italic">No answers attached to this submission record.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoadingResponses}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-stone-500 font-medium">Page {page}</span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!responsesData.next || isLoadingResponses}
                  className="text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
