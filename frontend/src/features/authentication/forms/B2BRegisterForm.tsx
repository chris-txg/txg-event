'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  b2bRegisterSchema,
  B2BRegisterFormData,
} from '@/features/authentication/schemas/customer-register.schema';
import { authClientService } from '@/features/authentication/services/authClientService';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { handleFormApiErrors } from '@/features/authentication/utils/error-handler';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { User, Mail, Lock, Phone, MapPin, Building2, FileText, ArrowRight } from 'lucide-react';

export function B2BRegisterForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<B2BRegisterFormData>({
    resolver: zodResolver(b2bRegisterSchema),
    defaultValues: {
      customer_type: 'B2B',
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone: '',
      company_name: '',
      gst_number: '',
      city: '',
      password: '',
      password_confirm: '',
    },
  });

  const onSubmit = async (data: B2BRegisterFormData) => {
    setGeneralError(null);
    try {
      const res = await authClientService.registerB2B(data);

      if (!res.ok) {
        handleFormApiErrors<B2BRegisterFormData>(res.error, setError, setGeneralError);
        return;
      }

      if (res.data?.user) {
        setUser(res.data.user);
        router.push('/profile');
        router.refresh();
      }
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {generalError && (
        <Alert variant="error" title="Registration Failed">
          {generalError}
        </Alert>
      )}

      {/* Corporate profile fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Company / Organization Name"
          placeholder="Acme Events Pvt Ltd"
          startIcon={<Building2 className="h-4 w-4" />}
          error={errors.company_name?.message}
          {...register('company_name')}
        />
        <Input
          label="GSTIN (15 Digits)"
          placeholder="29ABCDE1234F1Z5"
          className="uppercase"
          startIcon={<FileText className="h-4 w-4" />}
          helperText="Format: 2 digits, 5 letters, 4 digits, 1 letter, 1 alphanumeric, Z, 1 alphanumeric"
          error={errors.gst_number?.message}
          {...register('gst_number')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Authorized Person First Name"
          placeholder="Jane"
          startIcon={<User className="h-4 w-4" />}
          error={errors.first_name?.message}
          {...register('first_name')}
        />
        <Input
          label="Authorized Person Last Name"
          placeholder="Doe"
          startIcon={<User className="h-4 w-4" />}
          error={errors.last_name?.message}
          {...register('last_name')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Username"
          placeholder="acme_corp"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <Input
          label="Corporate Email"
          type="email"
          placeholder="events@acme.com"
          autoComplete="email"
          startIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Corporate Phone"
          type="tel"
          placeholder="+91 98765 43210"
          startIcon={<Phone className="h-4 w-4" />}
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="HQ City"
          placeholder="Mumbai, Bengaluru..."
          startIcon={<MapPin className="h-4 w-4" />}
          error={errors.city?.message}
          {...register('city')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          showPasswordToggle
          startIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          showPasswordToggle
          startIcon={<Lock className="h-4 w-4" />}
          error={errors.password_confirm?.message}
          {...register('password_confirm')}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full mt-2"
        isLoading={isSubmitting}
      >
        <span>Register Corporate Account</span>
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </form>
  );
}
