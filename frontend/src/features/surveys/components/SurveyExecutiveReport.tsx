'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Users,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  FolderKanban,
} from 'lucide-react';
import {
  SurveyDetail,
  Question,
} from '@/features/surveys/types/survey.types';
import {
  useSurveyAnalytics,
  useSurveyResponses,
} from '@/features/surveys/hooks/useSurveys';
import {
  DonutChart,
  HorizontalBarChart,
  TimelineBarChart,
  DonutSegment,
  HorizontalBarItem,
  TimelineDataPoint,
} from './charts';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

export interface SurveyExecutiveReportProps {
  survey: SurveyDetail;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function SurveyExecutiveReport({
  survey,
  onClose,
  showCloseButton = false,
}: SurveyExecutiveReportProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    isError: isAnalyticsError,
    error: analyticsError,
  } = useSurveyAnalytics(survey.id);

  // 2. Fetch All Responses for qualitative answers and timeline
  const {
    data: responsesData,
    isLoading: isLoadingResponses,
  } = useSurveyResponses(survey.id, 1);

  const totalResponses = analytics?.total_responses ?? survey.response_count ?? 0;
  const questionsList = analytics?.questions ?? [];
  const responsesList = responsesData?.results ?? [];
  const surveyQuestions: Question[] = survey.questions || [];

  // -------------------------------------------------------------
  // KPI Metrics Calculation (Strictly Real Data)
  // -------------------------------------------------------------
  const kpis = useMemo(() => {
    const totalQuestionsCount = surveyQuestions.length;
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

    surveyQuestions.forEach((q) => {
      const qAnalytics = questionsList.find((item) => item.question_id === q.id);
      const answeredTotal = qAnalytics?.answered_count ?? totalResponses;

      if (q.question_type === 'single' || q.question_type === 'boolean') {
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

    // Timeline calculation
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
  // Key Insights Generator (Strictly Real Data)
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

  const [isPrinting, setIsPrinting] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPdf(true);
      const res = await fetch(`/api/surveys/${encodeURIComponent(survey.id)}/report/download`);
      if (!res.ok) {
        throw new Error('Failed to download PDF report');
      }

      const blob = await res.blob();
      const sanitizedTitle = survey.title.trim().replace(/[<>:"/\\|?*]+/g, '') || 'Survey_Report';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizedTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Direct PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      // Fetch the exact same binary PDF generated by backend
      const res = await fetch(`/api/surveys/${encodeURIComponent(survey.id)}/report/download`);
      if (!res.ok) {
        throw new Error('Failed to fetch PDF report for printing');
      }

      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(pdfBlob);

      // Create a hidden iframe to trigger print of the exact generated PDF document
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          // If browser restricts cross-document print on blob iframe, open in dedicated tab for printing
          const printWindow = window.open(blobUrl, '_blank');
          if (printWindow) {
            printWindow.onload = () => {
              printWindow.print();
            };
          }
        }
        // Cleanup after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(blobUrl);
        }, 60000);
      };

      document.body.appendChild(iframe);
    } catch (err) {
      console.error('Error printing PDF report:', err);
      // Fallback
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const currentDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="survey-report-document space-y-8 max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* ------------------------------------------------------------- */}
      {/* Print-specific Stylesheet                                     */}
      {/* ------------------------------------------------------------- */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: #111 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, aside, header, footer, .no-print, button, [role="navigation"] {
            display: none !important;
          }
          .survey-report-document {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .page-break-before {
            page-break-before: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* Top Action Toolbar (Hidden in Print)                         */}
      {/* ------------------------------------------------------------- */}
      <div className="no-print flex items-center justify-between pb-3 border-b border-[#F0E6EA]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F8EFF2] text-[#762D46] grid place-items-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#30232A]">Executive Survey Report</h2>
            <p className="text-[11px] text-stone-400">Complete visual analytics breakdown (PDF printable)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#542037] hover:bg-[#421827] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
            title={`Download "${survey.title}.pdf"`}
          >
            {isExportingPdf ? (
              <>
                <Spinner size="sm" />
                <span>Downloading PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download as PDF</span>
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#542037] bg-white hover:bg-[#FAF5F7] disabled:opacity-60 disabled:cursor-not-allowed border border-[#E9DDE1] rounded-xl shadow-xs transition-all cursor-pointer"
            title="Print report"
          >
            {isPrinting ? (
              <>
                <Spinner size="sm" />
                <span>Preparing Print...</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </>
            )}
          </button>
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div id="survey-report-printable-area" className="space-y-8 bg-transparent">
        {/* ------------------------------------------------------------- */}
        {/* 1. Executive Report Document Header                           */}
        {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs print:shadow-none print:border-stone-300">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#F0E6EA] pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4E5EA] text-[#762D46]">
                Official Executive Report
              </span>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">
                {survey.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#30232A] tracking-tight">
              {survey.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#75666D] max-w-2xl">
              {survey.description || 'Comprehensive audience intelligence and question response analysis report.'}
            </p>
          </div>

          <div className="sm:text-right text-xs text-stone-500 space-y-1 shrink-0">
            <p className="font-semibold text-stone-700">Date Generated</p>
            <p className="font-mono text-[11px] text-[#542037]">{currentDate}</p>
            {survey.project_name && (
              <p className="inline-flex items-center sm:justify-end gap-1 text-[11px] text-[#762D46] font-medium pt-1">
                <FolderKanban className="w-3 h-3" />
                <span>{survey.project_name}</span>
              </p>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. Top 4 Metric Cards (Zero Mock Numbers)                     */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-[#FAF6F7] rounded-xl border border-[#F0E6EA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Responses</p>
            <p className="text-2xl sm:text-3xl font-black text-[#542037] mt-1">{totalResponses.toLocaleString()}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Live participant submissions</p>
          </div>
          <div className="bg-[#FAF6F7] rounded-xl border border-[#F0E6EA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Questions Configured</p>
            <p className="text-2xl sm:text-3xl font-black text-[#542037] mt-1">{kpis.totalQuestionsCount}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Tracked survey fields</p>
          </div>
          <div className="bg-[#FAF6F7] rounded-xl border border-[#F0E6EA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Completion Rate</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{kpis.completionRate}%</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Full answer completion</p>
          </div>
          <div className="bg-[#FAF6F7] rounded-xl border border-[#F0E6EA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Survey Visibility</p>
            <p className="text-xl sm:text-2xl font-black capitalize text-[#30232A] mt-1">{survey.visibility}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">{survey.status} state</p>
          </div>
        </div>
      </div>

      {/* Loading States */}
      {isLoadingAnalytics && (
        <div className="py-8 flex items-center justify-center space-y-2 no-print">
          <Spinner size="md" />
          <span className="text-xs text-stone-400 ml-2">Assembling visual charts and response metrics...</span>
        </div>
      )}

      {isAnalyticsError && (
        <Alert variant="warning" title="Analytics Notification">
          {analyticsError?.message || 'Could not load complete aggregated stats.'}
        </Alert>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Visual Charts & Questions Section                          */}
      {/* ------------------------------------------------------------- */}
      {surveyQuestions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[#F0E6EA] pb-2">
            <TrendingUp className="w-4 h-4 text-[#762D46]" />
            <h2 className="text-base font-bold text-[#30232A]">Question Analytics & Distribution Charts</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {questionVisuals.map((visual, idx) => {
              if (visual.type === 'donut') {
                return (
                  <div key={visual.title + idx} className="avoid-break">
                    <DonutChart
                      title={visual.title}
                      total={visual.total}
                      segments={visual.segments}
                    />
                  </div>
                );
              }
              if (visual.type === 'bar') {
                return (
                  <div key={visual.title + idx} className="avoid-break">
                    <HorizontalBarChart
                      title={visual.title}
                      items={visual.items}
                    />
                  </div>
                );
              }
              if (visual.type === 'numeric') {
                return (
                  <div
                    key={visual.title + idx}
                    className="avoid-break bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs flex flex-col justify-between print:border-stone-300"
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

            {/* Daily Timeline */}
            {timelineData.length > 0 && (
              <div className="avoid-break">
                <TimelineBarChart
                  title="Daily responses timeline"
                  data={timelineData}
                />
              </div>
            )}
          </div>

          {/* Qualitative Text & Date Questions */}
          {Object.entries(textQuestionsMap).map(([qId, data]) => (
            <div
              key={qId}
              className="avoid-break bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs space-y-3 print:border-stone-300"
            >
              <div className="flex items-center justify-between border-b border-[#F0E6EA] pb-2">
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
      {/* 4. Executive Summary & Key Research Insights                  */}
      {/* ------------------------------------------------------------- */}
      <div className="avoid-break bg-white rounded-2xl border border-[#E9DDE1] p-6 shadow-xs print:border-stone-300">
        <h3 className="text-sm font-bold text-[#30232A] tracking-tight mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#762D46]" />
          <span>Key Research Insights & Summary Observations</span>
        </h3>
        <ul className="space-y-2 text-xs text-[#52414A] leading-relaxed list-disc list-inside">
          {keyInsights.map((insight, idx) => (
            <li key={idx} className="marker:text-[#762D46]">
              {insight}
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-3 border-t border-[#F8EFF2] flex items-center justify-between text-[11px] text-stone-400">
          <span>Antigravity Event Intelligence Suite</span>
          <span>End of Executive Report</span>
        </div>
      </div>
    </div>
  </div>
);
}
