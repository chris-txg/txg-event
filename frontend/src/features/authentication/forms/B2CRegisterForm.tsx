'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  b2cRegisterSchema,
  B2CRegisterFormData,
} from '@/features/authentication/schemas/customer-register.schema';
import { authClientService } from '@/features/authentication/services/authClientService';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { handleFormApiErrors } from '@/features/authentication/utils/error-handler';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { User, Mail, Lock, Phone, MapPin, ArrowRight } from 'lucide-react';

export function B2CRegisterForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<B2CRegisterFormData>({
    resolver: zodResolver(b2cRegisterSchema),
    defaultValues: {
      customer_type: 'B2C',
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone: '',
      city: '',
      password: '',
      password_confirm: '',
    },
  });

  const onSubmit = async (data: B2CRegisterFormData) => {
    setGeneralError(null);
    try {
      const res = await authClientService.registerB2C(data);

      if (!res.ok) {
        handleFormApiErrors<B2CRegisterFormData>(res.error, setError, setGeneralError);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="First Name"
          placeholder="Jane"
          startIcon={<User className="h-4 w-4" />}
          error={errors.first_name?.message}
          {...register('first_name')}
        />
        <Input
          label="Last Name"
          placeholder="Doe"
          startIcon={<User className="h-4 w-4" />}
          error={errors.last_name?.message}
          {...register('last_name')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Username"
          placeholder="janedoe"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <Input
          label="Email Address"
          type="email"
          placeholder="jane@example.com"
          autoComplete="email"
          startIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Phone (Optional)"
          type="tel"
          placeholder="+91 98765 43210"
          startIcon={<Phone className="h-4 w-4" />}
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="City (Optional)"
          placeholder="Mumbai, Bangalore..."
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
        <span>Create Individual Account</span>
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </form>
  );
}
