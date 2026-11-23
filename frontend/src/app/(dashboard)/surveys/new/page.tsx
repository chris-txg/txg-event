'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useCreateSurvey } from '@/features/surveys/hooks/useSurveys';
import { SurveyForm } from '@/features/surveys/components/SurveyForm';
import { projectClientService } from '@/features/projects/services/projectClientService';
import { Spinner } from '@/components/ui/Spinner';
import {
  ArrowLeft,
} from 'lucide-react';

function NewSurveyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project');

  // If created with a project param, fetch project name for display
  const { data: lockedProject } = useQuery({
    queryKey: ['project', projectIdParam],
    queryFn: async () => {
      if (!projectIdParam) return null;
      const res = await projectClientService.getProjectById(projectIdParam);
      if (!res.ok || !res.data) return null;
      return res.data;
    },
    enabled: Boolean(projectIdParam),
    staleTime: 5 * 60 * 1000,
  });

  const createSurveyMutation = useCreateSurvey();

  const handleCreateSurvey = async (payload: {
    project: string;
    title: string;
    description?: string;
    visibility: 'public' | 'private';
    allow_anonymous: boolean;
    duplicate_rule: 'allow_multiple' | 'one_per_user' | 'one_per_ip';
    start_date?: string | null;
    end_date?: string | null;
  }) => {
    const createdSurvey = await createSurveyMutation.mutateAsync(payload);
    router.push(`/surveys/${createdSurvey.id}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Context Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <Link href="/surveys" className="hover:text-[#762D46] transition-colors">
          Surveys
        </Link>
        <span>/</span>
        <span className="text-stone-800 font-semibold">New Survey</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9DDE1]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#30232A]">
            Create Audience Survey
          </h1>
          <p className="text-xs sm:text-sm text-[#75666D] mt-1">
            Author a new questionnaire campaign scoped to an Event Project.
          </p>
        </div>

        <Link
          href={projectIdParam ? `/projects/${projectIdParam}` : '/surveys'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{projectIdParam ? 'Back to Project' : 'Back to Surveys'}</span>
        </Link>
      </div>

      {/* Form Card */}
      <SurveyForm
        mode="create"
        lockedProjectId={projectIdParam || undefined}
        lockedProjectName={lockedProject?.project_name || undefined}
        onSubmit={handleCreateSurvey}
        isSubmitting={createSurveyMutation.isPending}
      />
    </div>
  );
}

export default function NewSurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-stone-500 mt-3">Loading survey creator...</p>
        </div>
      }
    >
      <NewSurveyContent />
    </Suspense>
  );
}
