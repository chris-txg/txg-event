'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { projectClientService } from '@/features/projects/services/projectClientService';
import { ProjectForm } from '@/features/projects/components/ProjectForm';

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProject = async (formData: FormData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await projectClientService.createProject(formData);

      if (!res.ok) {
        let msg = 'Failed to create project.';
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

      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProjectForm
      mode="create"
      onSubmit={handleCreateProject}
      isSubmitting={isSubmitting}
      submitError={submitError}
    />
  );
}
