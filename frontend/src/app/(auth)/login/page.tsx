import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { LoginForm } from '@/features/authentication/forms/LoginForm';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Sign In — Event Manager',
  description: 'Sign in to your Event Manager account to manage events and vendors.',
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
