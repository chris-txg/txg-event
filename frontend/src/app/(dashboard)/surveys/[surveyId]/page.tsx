'use client';

import React, { useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList,
  FolderKanban,
  Edit3,
  Trash2,
  Clock,
  Globe,
  Lock,
  UserCheck,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { useSurvey } from '@/features/surveys/hooks/useSurveys';
import {
  SurveyStatus,
  SurveyVisibility,
  DuplicateRule,
} from '@/features/surveys/types/survey.types';
import { DeleteSurveyModal } from '@/features/surveys/components/DeleteSurveyModal';
import { QuestionBuilder } from '@/features/surveys/components/QuestionBuilder';
import { SurveyPublishSection } from '@/features/surveys/components/SurveyPublishSection';
import { SurveyShareSection } from '@/features/surveys/components/SurveyShareSection';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

function SurveyDetailContent() {
  const params = useParams();
  const surveyId = params?.surveyId as string;
  const router = useRouter();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    data: survey,
    isLoading,
    isError,
    error,
    refetch,
  } = useSurvey(surveyId);

  const renderStatusBadge = (status: SurveyStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Published & Active
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            <span className="w-2 h-2 rounded-full bg-stone-400" />
            Closed
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Draft Mode
          </span>
        );
    }
  };

  const renderVisibilityBadge = (visibility: SurveyVisibility) => {
    if (visibility === 'public') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
          <Globe className="w-3.5 h-3.5 text-sky-600" />
          Public Survey
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
        <Lock className="w-3.5 h-3.5 text-purple-600" />
        Private Survey
      </span>
    );
  };

  const renderDuplicateRuleText = (rule: DuplicateRule) => {
    switch (rule) {
      case 'one_per_ip':
        return 'One response per IP address';
      case 'one_per_user':
        return 'One response per authenticated user';
      case 'allow_multiple':
      default:
        return 'Multiple repeat submissions allowed';
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Not set';
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? isoString : d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-stone-500 mt-3">Loading survey details...</p>
      </div>
    );
  }

  if (isError || !survey) {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-12 text-left">
        <Alert variant="error" title="Survey Not Found or Access Denied">
          <p>{error instanceof Error ? error.message : 'The requested survey could not be retrieved.'}</p>
        </Alert>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Retry Fetch
          </button>
          <Link
            href="/surveys"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#762D46] text-white font-semibold text-xs hover:bg-[#5C2337] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Surveys</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-left max-w-5xl">
      {/* Context Breadcrumbs */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <Link href="/surveys" className="hover:text-[#762D46] transition-colors">
            Surveys
          </Link>
          <span>/</span>
          {survey.project_name && (
            <>
              <Link href={`/projects/${survey.project}`} className="hover:text-[#762D46] transition-colors truncate max-w-xs">
                {survey.project_name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-stone-800 font-semibold truncate max-w-xs">{survey.title}</span>
        </div>

        <Link
          href="/surveys"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#762D46] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Surveys</span>
        </Link>
      </div>

      {/* Main Hero Header Card */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#F8EFF2]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {renderStatusBadge(survey.status)}
              {renderVisibilityBadge(survey.visibility)}
              {survey.project_name && (
                <Link
                  href={`/projects/${survey.project}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F4E5EA] text-[#762D46] hover:bg-[#EAD0D9] transition-colors"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-[#A84A63]" />
                  <span>{survey.project_name}</span>
                </Link>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#30232A]">
              {survey.title}
            </h1>

            {survey.description && (
              <p className="text-sm text-[#75666D] leading-relaxed max-w-3xl whitespace-pre-line">
                {survey.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={`/surveys/${survey.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-stone-700 hover:text-[#762D46] hover:bg-[#F4E5EA]/40 font-semibold text-xs border border-stone-200 transition-colors shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-500" />
              <span>Edit Metadata</span>
            </Link>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs border border-rose-200 transition-colors shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Quick Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
            <p className="text-[#75666D] font-medium flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-[#762D46]" />
              Anonymous Responses
            </p>
            <p className="text-sm font-bold text-[#30232A]">
              {survey.allow_anonymous ? 'Allowed' : 'Requires Login'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
            <p className="text-[#75666D] font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#762D46]" />
              Duplicate Submission Rule
            </p>
            <p className="text-xs font-bold text-[#30232A]">
              {renderDuplicateRuleText(survey.duplicate_rule)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
            <p className="text-[#75666D] font-medium flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5 text-[#762D46]" />
              Recorded Responses
            </p>
            <p className="text-sm font-bold text-[#762D46]">
              {survey.response_count} {survey.response_count === 1 ? 'Response' : 'Responses'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
            <p className="text-[#75666D] font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#762D46]" />
              Schedule Window
            </p>
            <p className="text-xs font-semibold text-[#30232A]">
              {survey.start_date || survey.end_date
                ? `${formatDate(survey.start_date)} to ${formatDate(survey.end_date)}`
                : 'Always active when published'}
            </p>
          </div>
        </div>
      </div>

      {/* Survey Publishing & Lifecycle Section */}
      <SurveyPublishSection
        survey={survey}
        onSurveyUpdated={() => {
          refetch();
        }}
      />

      {/* Direct Respondent Sharing & Distribution Section */}
      <SurveyShareSection survey={survey} />

      {/* Survey Question Builder */}
      <QuestionBuilder survey={survey} />

      {/* Delete Survey Confirmation Modal */}
      <DeleteSurveyModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        survey={survey}
        onSuccess={() => {
          router.push('/surveys');
        }}
      />
    </div>
  );
}

export default function SurveyDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-stone-500 mt-3">Loading survey...</p>
        </div>
      }
    >
      <SurveyDetailContent />
    </Suspense>
  );
}
