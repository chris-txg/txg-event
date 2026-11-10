import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/authentication/forms/ResetPasswordForm';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Set New Password — Event Manager',
  description: 'Enter your new password to regain access to your account.',
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
