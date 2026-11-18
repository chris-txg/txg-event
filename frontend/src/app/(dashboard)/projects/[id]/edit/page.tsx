'use client';

import React, { useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectClientService } from '@/features/projects/services/projectClientService';
import { ProjectForm } from '@/features/projects/components/ProjectForm';
import { SupportingDocument } from '@/features/projects/types/project.types';
import { Spinner } from '@/components/ui/Spinner';
import { AlertCircle } from 'lucide-react';

function EditProjectContent() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingDocs, setExistingDocs] = useState<SupportingDocument[] | null>(null);

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
      if (!res.ok || !res.data) {
        throw new Error(
          typeof res.error === 'object' && res.error && 'detail' in res.error
            ? String((res.error as { detail: unknown }).detail)
            : 'Failed to load project details for editing.'
        );
      }
      return res.data;
    },
    enabled: !!id,
  });

  // Synchronize existing documents from fetched project
  const currentDocs = existingDocs ?? project?.documents ?? [];

  const handleUpdateProject = async (formData: FormData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await projectClientService.updateProject(id, formData);

      if (!res.ok) {
        let msg = 'Failed to update project.';
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
        setIsSubmitting(false);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['project', id] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push(`/projects/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setSubmitError(null);
    try {
      const res = await projectClientService.deleteDocument(id, docId);
      if (!res.ok) {
        let msg = 'Failed to delete document.';
        if (typeof res.error === 'object' && res.error !== null) {
          const errObj = res.error as Record<string, unknown>;
          if (errObj.detail && typeof errObj.detail === 'string') {
            msg = errObj.detail;
          }
        }
        setSubmitError(msg);
        return;
      }

      setExistingDocs((prev) => (prev ?? project?.documents ?? []).filter((d) => d.id !== docId));
      await queryClient.invalidateQueries({ queryKey: ['project', id] });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete document.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-[#75666D] mt-3">Loading project for editing...</p>
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
    <ProjectForm
      mode="edit"
      initialData={project}
      onSubmit={handleUpdateProject}
      isSubmitting={isSubmitting}
      submitError={submitError}
      existingDocuments={currentDocs}
      onDeleteDocument={handleDeleteDocument}
    />
  );
}

export default function EditProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-[#75666D] mt-3">Loading edit workspace...</p>
        </div>
      }
    >
      <EditProjectContent />
    </Suspense>
  );
}
