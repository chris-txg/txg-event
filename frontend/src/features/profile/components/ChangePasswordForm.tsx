'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordSchema,
  ChangePasswordFormData,
} from '@/features/authentication/schemas/password.schema';
import { authClientService } from '@/features/authentication/services/authClientService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Lock } from 'lucide-react';
import { scrollToFirstFormError } from '@/lib/utils/formValidation';

export function ChangePasswordForm() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      old_password: '',
      new_password: '',
      new_password_confirm: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await authClientService.changePassword(data);

      if (!res.ok) {
        let msg = 'Failed to update password. Please check your current password.';
        if (typeof res.error === 'object' && res.error !== null) {
          const errObj = res.error as Record<string, unknown>;
          if (errObj.detail && typeof errObj.detail === 'string') {
            msg = errObj.detail;
          } else if (errObj.old_password && Array.isArray(errObj.old_password)) {
            msg = String(errObj.old_password[0]);
          }
        }
        setError(msg);
        return;
      }

      setSuccess('Your password has been changed successfully.');
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Security & Password</CardTitle>
        <CardDescription>
          Update your login password regularly to protect your account
        </CardDescription>
      </CardHeader>

      {success && (
        <div className="mb-4">
          <Alert variant="success" title="Success">
            {success}
          </Alert>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Update Failed">
            {error}
          </Alert>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, (errs) => scrollToFirstFormError(errs))}
        className="space-y-4"
        noValidate
      >
        <Input
          label="Current Password"
          required
          type="password"
          placeholder="••••••••"
          showPasswordToggle
          startIcon={<Lock className="h-4 w-4" />}
          error={errors.old_password?.message}
          {...register('old_password')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="New Password"
            required
            type="password"
            placeholder="••••••••"
            showPasswordToggle
            startIcon={<Lock className="h-4 w-4" />}
            error={errors.new_password?.message}
            helperText="Minimum 8 characters"
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
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
          >
            <span>Update Password</span>
          </Button>
        </div>
      </form>
    </Card>
  );
}
