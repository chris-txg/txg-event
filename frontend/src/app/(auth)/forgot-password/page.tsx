import React from 'react';
import { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/authentication/forms/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot Password — Event Manager',
  description: 'Request a password reset link for your Event Manager account.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
