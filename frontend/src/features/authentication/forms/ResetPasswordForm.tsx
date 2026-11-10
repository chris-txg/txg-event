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
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

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
    try {
      const res = await authClientService.resetPassword({
        ...data,
        uid: data.uid || uid,
        token: data.token || token,
      });

      if (!res.ok) {
        let msg = 'Password reset failed. The link may have expired or is invalid.';
        if (typeof res.error === 'object' && res.error !== null) {
          const errObj = res.error as Record<string, unknown>;
          if (errObj.detail && typeof errObj.detail === 'string') {
            msg = errObj.detail;
          } else if (errObj.error && typeof errObj.error === 'string') {
            msg = errObj.error;
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
            The password reset link appears incomplete or missing authentication parameters.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <Alert variant="warning" title="Missing Token Parameters">
            Please make sure you followed the full link provided in your password reset email.
          </Alert>
          <Link href="/forgot-password" className="block">
            <Button variant="outline" size="md" className="w-full">
              <span>Request a new link</span>
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>
          Choose a secure password with at least 8 characters
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errorMessage && (
            <Alert variant="error" title="Reset Failed">
              {errorMessage}
            </Alert>
          )}

          <input type="hidden" {...register('uid')} value={uid} />
          <input type="hidden" {...register('token')} value={token} />

          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            showPasswordToggle
            startIcon={<Lock className="h-4 w-4" />}
            error={errors.new_password?.message}
            {...register('new_password')}
          />

          <Input
            label="Confirm New Password"
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
            className="w-full mt-2"
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
