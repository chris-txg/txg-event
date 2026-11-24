'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Users,
  FileSpreadsheet,
  Download,
  Share2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  HelpCircle,
  Clock,
  ShieldCheck,
  MessageSquare,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  SurveyDetail,
  Question,
  QuestionAnalyticsItem,
  SurveyResponseDetail,
  AnswerDetail,
} from '@/features/surveys/types/survey.types';
import {
  useSurveyAnalytics,
  useSurveyResponses,
} from '@/features/surveys/hooks/useSurveys';
import { SurveyExecutiveReport } from './SurveyExecutiveReport';
import {
  DonutChart,
  HorizontalBarChart,
  TimelineBarChart,
  DonutSegment,
  HorizontalBarItem,
  TimelineDataPoint,
} from './charts';

export interface SurveyAnalyticsSectionProps {
  survey: SurveyDetail;
  onCopyShareLink?: () => void;
}

export function SurveyAnalyticsSection({ survey, onCopyShareLink }: SurveyAnalyticsSectionProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isFeasibilityModalOpen, setIsFeasibilityModalOpen] = useState(false);

  // 1. Fetch Aggregated Analytics from Backend
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    isError: isAnalyticsError,
    error: analyticsError,
    refetch: refetchAnalytics,
    isFetching: isFetchingAnalytics,
  } = useSurveyAnalytics(survey.id);

  // 2. Fetch Detailed Individual Responses
  const {
    data: responsesData,
    isLoading: isLoadingResponses,
    isError: isResponsesError,
    error: responsesError,
    refetch: refetchResponses,
    isFetching: isFetchingResponses,
  } = useSurveyResponses(survey.id, page);

  const totalResponses = analytics?.total_responses ?? survey.response_count ?? 0;
  const questionsList = analytics?.questions ?? [];
  const responsesList = responsesData?.results ?? [];
  const totalPages = responsesData?.total_pages ?? 1;

  // Actual questions defined on the survey
  const surveyQuestions: Question[] = survey.questions || [];

  // -------------------------------------------------------------
  // KPI Metrics Calculation (Strictly Real Data, Zero Mock Numbers)
  // -------------------------------------------------------------
  const kpis = useMemo(() => {
    const totalQuestionsCount = surveyQuestions.length;

    // Calculate real completion rate across responses
    let completionRate = 0;
    if (totalResponses > 0 && totalQuestionsCount > 0 && responsesList.length > 0) {
      const fullyAnswered = responsesList.filter(
        (r) => (r.answers?.length ?? 0) >= totalQuestionsCount
      ).length;
      completionRate = Math.round((fullyAnswered / responsesList.length) * 100);
    } else if (totalResponses > 0) {
      completionRate = 100;
    }

    return {
      totalResponses,
      totalQuestionsCount,
      completionRate,
      status: survey.status,
    };
  }, [totalResponses, surveyQuestions.length, responsesList, survey.status]);

  // -------------------------------------------------------------
  // Question Analytics Dynamic Mapping (Strictly Real Data)
  // -------------------------------------------------------------
  const { questionVisuals, timelineData, textQuestionsMap } = useMemo(() => {
    const visuals: Array<
      | { type: 'donut'; title: string; total: number; segments: DonutSegment[] }
      | { type: 'bar'; title: string; items: HorizontalBarItem[] }
      | { type: 'numeric'; title: string; min: number | null; max: number | null; avg: number | null }
    > = [];

    const textMap: Record<string, { questionText: string; answers: Array<{ text: string; date: string; respondent: string }> }> = {};

    // Map each actual question in the survey
    surveyQuestions.forEach((q) => {
      // Find backend analytics stats for this question if available
      const qAnalytics = questionsList.find((item) => item.question_id === q.id);
      const answeredTotal = qAnalytics?.answered_count ?? totalResponses;

      if (q.question_type === 'single' || q.question_type === 'boolean') {
        // Build segments from actual question choices or Boolean [Yes, No]
        const choiceItems = q.question_type === 'boolean'
          ? [{ id: 'true', text: 'Yes' }, { id: 'false', text: 'No' }]
          : (q.choices?.map((c) => ({ id: c.id, text: c.text })) || []);

        const segments: DonutSegment[] = choiceItems.map((item) => {
          const distItem = qAnalytics?.distribution?.find((d) => {
            const opt = String(d.option).toLowerCase().trim();
            const textMatch = opt === item.text.toLowerCase().trim();
            const idMatch = opt === item.id.toLowerCase().trim();
            const boolMatch =
              (item.text.toLowerCase() === 'yes' && (opt === 'true' || opt === 'yes' || opt === '1')) ||
              (item.text.toLowerCase() === 'no' && (opt === 'false' || opt === 'no' || opt === '0'));
            return textMatch || idMatch || boolMatch;
          });
          const count = distItem ? distItem.count : 0;
          const percentage = distItem ? distItem.percentage : 0;
          return {
            label: item.text,
            count,
            percentage,
          };
        });

        if (choiceItems.length <= 4) {
          visuals.push({
            type: 'donut',
            title: q.text,
            total: answeredTotal,
            segments,
          });
        } else {
          visuals.push({
            type: 'bar',
            title: q.text,
            items: segments.map((s) => ({ label: s.label, count: s.count, percentage: s.percentage })),
          });
        }
      } else if (q.question_type === 'multiple') {
        const choiceItems = q.choices?.map((c) => ({ id: c.id, text: c.text })) || [];
        const items: HorizontalBarItem[] = choiceItems.map((item) => {
          const distItem = qAnalytics?.distribution?.find((d) => {
            const opt = String(d.option).toLowerCase().trim();
            const textMatch = opt === item.text.toLowerCase().trim();
            const idMatch = opt === item.id.toLowerCase().trim();
            return textMatch || idMatch;
          });
          return {
            label: item.text,
            count: distItem ? distItem.count : 0,
            percentage: distItem ? distItem.percentage : 0,
          };
        });

        visuals.push({
          type: 'bar',
          title: q.text,
          items,
        });
      } else if (q.question_type === 'number') {
        visuals.push({
          type: 'numeric',
          title: q.text,
          min: qAnalytics?.summary?.min ?? null,
          max: qAnalytics?.summary?.max ?? null,
          avg: qAnalytics?.summary?.avg ?? null,
        });
      } else if (q.question_type === 'text' || q.question_type === 'date') {
        // Collect real text answers from respondents
        const textAnswers: Array<{ text: string; date: string; respondent: string }> = [];
        responsesList.forEach((resp) => {
          const ans = resp.answers?.find((a) => a.question === q.id || a.question_text === q.text);
          if (ans && ans.value !== null && ans.value !== undefined && String(ans.value).trim()) {
            textAnswers.push({
              text: String(ans.value),
              date: resp.submitted_at ? new Date(resp.submitted_at).toLocaleDateString() : '',
              respondent: resp.respondent || resp.respondent_ip || 'Anonymous',
            });
          }
        });

        textMap[q.id] = {
          questionText: q.text,
          answers: textAnswers,
        };
      }
    });

    // Timeline calculation strictly from real responses
    const tData: TimelineDataPoint[] = [];
    if (responsesList.length > 0) {
      const datesMap: Record<string, number> = {};
      responsesList.forEach((r) => {
        if (!r.submitted_at) return;
        const d = new Date(r.submitted_at);
        const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        datesMap[key] = (datesMap[key] || 0) + 1;
      });

      Object.entries(datesMap).forEach(([date, count]) => {
        tData.push({ date, count });
      });
    }

    return {
      questionVisuals: visuals,
      timelineData: tData,
      textQuestionsMap: textMap,
    };
  }, [surveyQuestions, questionsList, totalResponses, responsesList]);

  // -------------------------------------------------------------
  // Key Insights Generator (Strictly Real Data, Zero Fake Text)
  // -------------------------------------------------------------
  const keyInsights = useMemo(() => {
    if (totalResponses === 0) {
      return [
        'No responses recorded yet for this survey.',
        'Audience analytics and percentage distributions will update automatically as respondents submit answers.',
        'Share the public survey link with participants to begin gathering live insights.',
      ];
    }

    const insights: string[] = [];
    insights.push(`Recorded ${totalResponses} valid submission${totalResponses === 1 ? '' : 's'} across ${surveyQuestions.length} survey question${surveyQuestions.length === 1 ? '' : 's'}.`);

    // Extract leading choice for any choice question
    questionVisuals.forEach((v) => {
      if (v.type === 'donut' && v.segments.length > 0) {
        const sorted = [...v.segments].sort((a, b) => b.percentage - a.percentage);
        if (sorted[0] && sorted[0].percentage > 0) {
          insights.push(`For "${v.title}": "${sorted[0].label}" is the leading response with ${Math.round(sorted[0].percentage)}% (${sorted[0].count} responses).`);
        }
      } else if (v.type === 'bar' && v.items.length > 0) {
        const sorted = [...v.items].sort((a, b) => b.percentage - a.percentage);
        if (sorted[0] && sorted[0].percentage > 0) {
          insights.push(`For "${v.title}": "${sorted[0].label}" has the highest preference with ${Math.round(sorted[0].percentage)}%.`);
        }
      }
    });

    if (insights.length === 1) {
      insights.push('Survey is active and accepting responses.');
    }

    return insights;
  }, [totalResponses, surveyQuestions.length, questionVisuals]);

  // Helper to map raw choice UUIDs and booleans to readable human text
  const getDisplayAnswerValue = (q: Question, val: any): string => {
    if (val === null || val === undefined || val === '') return '—';

    // Choice map for single and multiple
    const choiceMap: Record<string, string> = {};
    if (q.choices && q.choices.length > 0) {
      q.choices.forEach((c) => {
        choiceMap[String(c.id).toLowerCase()] = c.text;
      });
    }

    if (q.question_type === 'boolean') {
      if (val === true || val === 'true' || val === 'True' || val === 1 || val === '1') return 'Yes';
      if (val === false || val === 'false' || val === 'False' || val === 0 || val === '0') return 'No';
      return String(val);
    }

    if (q.question_type === 'multiple' && Array.isArray(val)) {
      return val
        .map((item) => choiceMap[String(item).toLowerCase()] || String(item))
        .join(', ');
    }

    if (q.question_type === 'single') {
      return choiceMap[String(val).toLowerCase()] || String(val);
    }

    if (Array.isArray(val)) {
      return val.join(', ');
    }

    return String(val);
  };

  // -------------------------------------------------------------
  // Export CSV Handler (Strictly Real Data & Dynamic Question Headers)
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    const headers = ['Respondent ID', 'Submitted At'];
    surveyQuestions.forEach((q, idx) => {
      headers.push(`"Q${idx + 1}: ${q.text.replace(/"/g, '""')}"`);
    });

    if (responsesList.length === 0) {
      const csvContent = headers.join(',') + '\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${survey.title.replace(/\s+/g, '_')}_Responses_Template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const rows = responsesList.map((resp, idx) => {
      const row = [
        `RESP-${(page - 1) * pageSize + idx + 1}`,
        resp.submitted_at || '',
      ];

      surveyQuestions.forEach((q) => {
        const ans = resp.answers?.find((a) => a.question === q.id || a.question_text === q.text);
        const valStr = getDisplayAnswerValue(q, ans?.value);
        row.push(`"${valStr.replace(/"/g, '""')}"`);
      });

      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${survey.title.replace(/\s+/g, '_')}_Responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    handleExportCSV();
  };

  const scrollToResponses = () => {
    const el = document.getElementById('response-management-table');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header Banner & Actions                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#F0E6EA]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                survey.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {survey.status}
            </span>
            <span className="text-[11px] font-bold text-[#A84A63] uppercase tracking-wide">
              Live Survey Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#30232A] tracking-tight">
            {survey.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#75666D]">
            {survey.description || 'Live attendee responses, question analytics and participant feedback.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={scrollToResponses}
            className="px-4 py-2 text-xs font-bold text-[#542037] bg-white hover:bg-[#FBF7F8] border border-[#E9DDE1] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            View Responses ({totalResponses})
          </button>
          <Link
            href={`/reports?surveyId=${survey.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#542037] hover:bg-[#421827] rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Report</span>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Top 4 Metric Cards (Strictly Real Survey Metrics)          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Responses */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 lowercase tracking-wide">
            total responses
          </p>
          <p className="text-3xl font-black text-[#542037] mt-2 tracking-tight">
            {totalResponses.toLocaleString()}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            {totalResponses === 0 ? 'No submissions recorded yet' : 'Recorded attendee responses'}
          </p>
        </div>

        {/* Card 2: Questions Configured */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 lowercase tracking-wide">
            questions configured
          </p>
          <p className="text-3xl font-black text-[#542037] mt-2 tracking-tight">
            {kpis.totalQuestionsCount}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Active survey question fields
          </p>
        </div>

        {/* Card 3: Completion Rate */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 lowercase tracking-wide">
            completion rate
          </p>
          <p className="text-3xl font-black text-[#542037] mt-2 tracking-tight">
            {kpis.completionRate}%
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            {totalResponses > 0 ? 'Full question completion' : '0% (awaiting responses)'}
          </p>
        </div>

        {/* Card 4: Survey Visibility & Status */}
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-5 shadow-xs">
          <p className="text-[11px] font-semibold text-stone-500 lowercase tracking-wide">
            survey status
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-3 h-3 rounded-full ${
                survey.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
              }`}
            />
            <p className="text-xl font-bold capitalize text-[#30232A]">
              {survey.status}
            </p>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {survey.visibility === 'public' ? 'Publicly shareable survey' : 'Private authenticated survey'}
          </p>
        </div>
      </div>

      {/* Loading or Error States */}
      {isLoadingAnalytics && (
        <div className="py-6 flex items-center justify-center space-y-2">
          <Spinner size="md" />
          <span className="text-xs text-stone-400 ml-2">Loading live survey analytics...</span>
        </div>
      )}

      {isAnalyticsError && (
        <Alert variant="warning" title="Analytics Notification">
          {analyticsError?.message || 'Could not load analytics. Displaying direct question ledger below.'}
        </Alert>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Charts & Questions Grid (Mapped to ACTUAL survey questions) */}
      {/* ------------------------------------------------------------- */}
      {surveyQuestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-12 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-stone-700">No Questions in This Survey</h3>
          <p className="text-xs text-stone-500 mt-1">
            Configure questions in the survey builder to begin collecting responses and charts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts Row */}
          {questionVisuals.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {questionVisuals.map((visual, idx) => {
                if (visual.type === 'donut') {
                  return (
                    <DonutChart
                      key={visual.title + idx}
                      title={visual.title}
                      total={visual.total}
                      segments={visual.segments}
                    />
                  );
                }
                if (visual.type === 'bar') {
                  return (
                    <HorizontalBarChart
                      key={visual.title + idx}
                      title={visual.title}
                      items={visual.items}
                    />
                  );
                }
                if (visual.type === 'numeric') {
                  return (
                    <div
                      key={visual.title + idx}
                      className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs flex flex-col justify-between"
                    >
                      <h3 className="text-sm font-bold text-[#30232A] mb-4 tracking-tight">
                        {visual.title} (Numeric Summary)
                      </h3>
                      <div className="grid grid-cols-3 gap-3 my-auto text-center">
                        <div className="p-3 bg-[#FAF5F7] rounded-xl border border-[#F0E6EA]">
                          <span className="text-[10px] text-stone-400 font-bold uppercase">Average</span>
                          <p className="text-xl font-black text-[#762D46] mt-1">{visual.avg ?? 0}</p>
                        </div>
                        <div className="p-3 bg-[#FAF5F7] rounded-xl border border-[#F0E6EA]">
                          <span className="text-[10px] text-stone-400 font-bold uppercase">Minimum</span>
                          <p className="text-xl font-black text-[#762D46] mt-1">{visual.min ?? 0}</p>
                        </div>
                        <div className="p-3 bg-[#FAF5F7] rounded-xl border border-[#F0E6EA]">
                          <span className="text-[10px] text-stone-400 font-bold uppercase">Maximum</span>
                          <p className="text-xl font-black text-[#762D46] mt-1">{visual.max ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}

              {/* Real Timeline Bar Chart (if multiple days of data exist) */}
              {timelineData.length > 0 && (
                <TimelineBarChart
                  title="Daily responses timeline"
                  data={timelineData}
                />
              )}
            </div>
          )}

          {/* Text Questions Response Cards */}
          {Object.entries(textQuestionsMap).map(([qId, data]) => (
            <div
              key={qId}
              className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#30232A] tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#762D46]" />
                  <span>Question: {data.questionText}</span>
                </h3>
                <span className="text-xs font-semibold text-stone-500">
                  {data.answers.length} Answer{data.answers.length === 1 ? '' : 's'} Submitted
                </span>
              </div>

              {data.answers.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">
                  No text answers recorded for this question yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {data.answers.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#FAF5F7] border border-[#F0E6EA] text-xs space-y-1"
                    >
                      <p className="font-semibold text-stone-900 break-words">
                        &quot;{item.text}&quot;
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                        <span>{item.respondent}</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. Key Research Insights Panel (Strictly Real Insights)       */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs">
        <h3 className="text-sm font-bold text-[#30232A] tracking-tight mb-3">
          Key research insights
        </h3>
        <ul className="space-y-2 text-xs text-[#52414A] leading-relaxed list-disc list-inside">
          {keyInsights.map((insight, idx) => (
            <li key={idx} className="marker:text-[#762D46]">
              {insight}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-stone-400 mt-4 border-t border-[#F8EFF2] pt-3">
          Insights update dynamically based on live respondent submissions.
        </p>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Response Management Table (Dynamic Question Columns)       */}
      {/* ------------------------------------------------------------- */}
      <div
        id="response-management-table"
        className="bg-white rounded-2xl border border-[#E9DDE1] shadow-xs overflow-hidden scroll-mt-20"
      >
        {/* Table Top Toolbar */}
        <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0E6EA]">
          <div>
            <h3 className="text-base font-bold text-[#30232A] tracking-tight">
              Response management
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Live submission records ({totalResponses} total)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#542037] bg-white hover:bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#542037]" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#542037] bg-white hover:bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#542037]" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Dynamic Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF6F7] text-stone-600 font-bold border-b border-[#F0E6EA]">
              <tr>
                <th className="py-3 px-5 text-[10px] tracking-wider uppercase shrink-0 whitespace-nowrap">
                  RESPONDENT ID
                </th>
                <th className="py-3 px-5 text-[10px] tracking-wider uppercase shrink-0 whitespace-nowrap">
                  SUBMITTED AT
                </th>
                {surveyQuestions.map((q, idx) => (
                  <th
                    key={q.id}
                    className="py-3 px-5 text-[10px] tracking-wider uppercase max-w-[220px] truncate"
                    title={q.text}
                  >
                    Q{idx + 1}: {q.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4ECF0] text-stone-700">
              {responsesList.length > 0 ? (
                responsesList.map((resp, idx) => {
                  const idDisplay = `RESP-${(page - 1) * pageSize + idx + 1}`;
                  const ansList = resp.answers || [];

                  const dateStr = resp.submitted_at
                    ? new Date(resp.submitted_at).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';

                  return (
                    <tr key={resp.id} className="hover:bg-[#FCF9FA] transition-colors">
                      <td className="py-3.5 px-5 font-mono text-stone-600 whitespace-nowrap">
                        {idDisplay}
                      </td>
                      <td className="py-3.5 px-5 text-stone-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      {surveyQuestions.map((q) => {
                        const ans = ansList.find(
                          (a) => a.question === q.id || a.question_text === q.text
                        );
                        const displayVal = getDisplayAnswerValue(q, ans?.value);

                        return (
                          <td
                            key={q.id}
                            className="py-3.5 px-5 text-stone-900 font-medium max-w-[260px] truncate"
                            title={displayVal}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={surveyQuestions.length + 2}
                    className="py-12 text-center text-stone-400 italic"
                  >
                    No responses recorded yet for this survey.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-4 border-t border-[#F0E6EA] flex items-center justify-between text-xs text-stone-500">
          <span>
            Showing page {page} of {totalPages} ({totalResponses} records)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md border border-[#E9DDE1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md border border-[#E9DDE1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. Executive Report Modal                                     */}
      {/* ------------------------------------------------------------- */}
      {isFeasibilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-[#FAF6F7] rounded-2xl max-w-5xl w-full p-4 sm:p-8 shadow-2xl border border-[#E9DDE1] max-h-[94vh] overflow-y-auto space-y-6 relative">
            <SurveyExecutiveReport
              survey={survey}
              onClose={() => setIsFeasibilityModalOpen(false)}
              showCloseButton={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
