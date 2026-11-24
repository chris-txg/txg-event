'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  resetPasswordConfirmSchema,
  ResetPasswordConfirmFormData,
} from '@/features/authentication/schemas/password.schema';
import { authClientService } from '@/features/authentication/services/authClientService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { scrollToFirstFormError } from '@/lib/utils/formValidation';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordConfirmFormData>({
    resolver: zodResolver(resetPasswordConfirmSchema),
    defaultValues: {
      uid,
      token,
      new_password: '',
      new_password_confirm: '',
    },
  });

  const onSubmit = async (data: ResetPasswordConfirmFormData) => {
    setErrorMessage(null);

    if (!data.uid || !data.token) {
      setErrorMessage('The reset password link is missing or invalid.');
      return;
    }

    try {
      const res = await authClientService.resetPassword(data);
      if (!res.ok) {
        let msg = 'Failed to reset password. The link may have expired.';
        if (typeof res.error === 'object' && res.error !== null) {
          const errObj = res.error as Record<string, string[] | string>;
          if (errObj.detail && typeof errObj.detail === 'string') {
            msg = errObj.detail;
          } else if (errObj.new_password && Array.isArray(errObj.new_password)) {
            msg = errObj.new_password[0];
          } else if (errObj.token && Array.isArray(errObj.token)) {
            msg = 'This password reset link is invalid or has already been used.';
          }
        }
        setErrorMessage(msg);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
  };

  if (!uid || !token) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or incomplete. Please request a new one.
          </CardDescription>
        </CardHeader>
        <div className="pt-2">
          <Link href="/forgot-password" className="block">
            <Button variant="primary" size="md" className="w-full">
              <span>Request New Link</span>
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Enter and confirm your new password below.
        </CardDescription>
      </CardHeader>

      {success ? (
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <Alert variant="success" title="Password Reset Successful">
            Your password has been securely reset. You can now log in with your new credentials.
          </Alert>
          <Link href="/login" className="block pt-2">
            <Button variant="primary" size="lg" className="w-full">
              <span>Proceed to Sign In</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit, (errs) => scrollToFirstFormError(errs))}
          className="space-y-4"
          noValidate
        >
          {errorMessage && (
            <Alert variant="error" title="Reset Failed">
              {errorMessage}
            </Alert>
          )}

          <input type="hidden" {...register('uid')} value={uid} />
          <input type="hidden" {...register('token')} value={token} />

          <Input
            label="New Password"
            required
            type="password"
            placeholder="••••••••"
            showPasswordToggle
            startIcon={<Lock className="h-4 w-4" />}
            error={errors.new_password?.message}
            helperText="At least 8 characters"
            {...register('new_password')}
          />

          <Input
            label="Confirm New Password"
            required
            type="password"
            placeholder="••••••••"
            showPasswordToggle
            startIcon={<Lock className="h-4 w-4" />}
            error={errors.new_password_confirm?.message}
            {...register('new_password_confirm')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
          >
            <span>Update Password</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>
      )}
    </Card>
  );
}
