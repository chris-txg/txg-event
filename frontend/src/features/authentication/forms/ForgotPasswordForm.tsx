'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
} from '@/features/authentication/schemas/password.schema';
import { authClientService } from '@/features/authentication/services/authClientService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export function ForgotPasswordForm() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await authClientService.forgotPassword(data);
      if (!res.ok) {
        setErrorMessage(
          typeof res.error === 'object' && res.error !== null
            ? (res.error as Record<string, string>).detail || 'Unable to process reset request.'
            : 'Unable to process reset request.'
        );
        return;
      }
      setSuccessMessage(
        res.data?.message ||
          'If an account exists with that email address, a password reset link has been dispatched.'
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your registered email address and we&apos;ll send you instructions to reset your password.
        </CardDescription>
      </CardHeader>

      {successMessage ? (
        <div className="space-y-4">
          <Alert variant="success" title="Instructions Dispatched">
            {successMessage}
          </Alert>
          <div className="pt-2">
            <Link href="/login" className="block">
              <Button variant="primary" size="md" className="w-full">
                <span>Return to Sign In</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errorMessage && (
            <Alert variant="error" title="Reset Request Failed">
              {errorMessage}
            </Alert>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            startIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
          >
            <span>Send Reset Instructions</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>

          <div className="pt-3 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#762D46] hover:text-[#A84A63] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}
