'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  vendorRegisterSchema,
  VendorRegisterFormData,
  VENDOR_CATEGORIES,
} from '@/features/authentication/schemas/vendor-register.schema';
import { authClientService } from '@/features/authentication/services/authClientService';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { handleFormApiErrors } from '@/features/authentication/utils/error-handler';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { User, Mail, Lock, Phone, MapPin, Store, ArrowRight } from 'lucide-react';

export function VendorRegisterForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VendorRegisterFormData>({
    resolver: zodResolver(vendorRegisterSchema),
    defaultValues: {
      business_name: '',
      business_category: 'VENUE',
      city: '',
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      password_confirm: '',
    },
  });

  const onSubmit = async (data: VendorRegisterFormData) => {
    setGeneralError(null);
    try {
      const res = await authClientService.registerVendor(data);

      if (!res.ok) {
        handleFormApiErrors<VendorRegisterFormData>(res.error, setError, setGeneralError);
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Join as a Service Vendor</CardTitle>
        <CardDescription>
          Showcase your event venue, catering, AV, photography, or services to verified organizers
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {generalError && (
          <Alert variant="error" title="Registration Failed">
            {generalError}
          </Alert>
        )}

        {/* Business details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Business / Brand Name"
            placeholder="Grand Horizon Banquets"
            startIcon={<Store className="h-4 w-4" />}
            error={errors.business_name?.message}
            {...register('business_name')}
          />
          <Select
            label="Service Category"
            options={VENDOR_CATEGORIES}
            error={errors.business_category?.message}
            {...register('business_category')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Operating City"
            placeholder="Mumbai, Delhi NCR, Bangalore..."
            startIcon={<MapPin className="h-4 w-4" />}
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="Contact Phone"
            type="tel"
            placeholder="+91 98765 43210"
            startIcon={<Phone className="h-4 w-4" />}
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>

        {/* Contact person details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Contact Person First Name"
            placeholder="Raj"
            startIcon={<User className="h-4 w-4" />}
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label="Contact Person Last Name"
            placeholder="Kapoor"
            startIcon={<User className="h-4 w-4" />}
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Account Username"
            placeholder="grand_horizon"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            label="Business Email"
            type="email"
            placeholder="contact@grandhorizon.com"
            autoComplete="email"
            startIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
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
          <span>Register Vendor Profile</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>

        <div className="pt-4 text-center text-xs text-stone-500 border-t border-stone-100">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold text-[#762D46] hover:text-[#A84A63] underline underline-offset-4 transition-colors"
          >
            Sign in here
          </Link>
        </div>
      </form>
    </Card>
  );
}
