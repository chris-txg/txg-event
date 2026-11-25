'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginSchema, LoginFormData } from '@/features/authentication/schemas/login.schema';
import { authClientService } from '@/features/authentication/services/authClientService';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { scrollToFirstFormError } from '@/lib/utils/formValidation';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/services';
  const { setUser } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const res = await authClientService.login(data);

      if (!res.ok) {
        let msg = 'Unable to sign in. Please verify your credentials.';
        if (typeof res.error === 'object' && res.error !== null) {
          const errObj = res.error as Record<string, unknown>;
          if (errObj.detail && typeof errObj.detail === 'string') {
            msg = errObj.detail;
          } else if (errObj.non_field_errors && Array.isArray(errObj.non_field_errors)) {
            msg = errObj.non_field_errors.join(' ');
          }
        }
        setServerError(msg);
        return;
      }

      if (res.data?.user) {
        setUser(res.data.user);
        const targetPath =
          res.data.user.password_updated === false ? '/profile' : redirectPath;
        router.push(targetPath);
        router.refresh();
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Enter your email or username to access your account
        </CardDescription>
      </CardHeader>

      <form
        onSubmit={handleSubmit(onSubmit, (errs) => scrollToFirstFormError(errs))}
        className="space-y-5"
        noValidate
      >
        {serverError && (
          <Alert variant="error" title="Sign In Failed">
            {serverError}
          </Alert>
        )}

        <Input
          label="Email or Username"
          required
          type="text"
          placeholder="you@example.com or username"
          autoComplete="username"
          startIcon={<Mail className="h-4 w-4" />}
          error={errors.identifier?.message}
          {...register('identifier')}
        />

        <div className="space-y-1.5">
          <Input
            label="Password"
            required
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            showPasswordToggle
            startIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end pt-1">
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#762D46] hover:text-[#A84A63] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          <span>Sign In</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>

        <div className="pt-4 text-center text-xs text-stone-500 border-t border-stone-100">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-bold text-[#762D46] hover:text-[#A84A63] underline underline-offset-4 transition-colors"
          >
            Create an account
          </Link>
        </div>
      </form>
    </Card>
  );
}
