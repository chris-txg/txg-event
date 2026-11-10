'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { CustomerProfileCard } from '@/features/profile/components/CustomerProfileCard';
import { VendorProfileCard } from '@/features/profile/components/VendorProfileCard';
import { ChangePasswordForm } from '@/features/profile/components/ChangePasswordForm';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, User as UserIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading, logout, refreshSession } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF7F8]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-stone-500 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#FBF7F8]">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-stone-200 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#F4E5EA] text-[#762D46] grid place-items-center mx-auto mb-4">
            <UserIcon className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-[#421827] mb-2">Session Required</h2>
          <p className="text-xs text-stone-500 mb-6">
            Please sign in to view and manage your account settings.
          </p>
          <Link href="/login" className="block">
            <Button variant="primary" size="md" className="w-full">
              <span>Go to Sign In</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7F8] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top bar with back to home */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#762D46] hover:text-[#A84A63] transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Event Manager</span>
          </Link>
          <span className="text-xs text-stone-400 font-mono">
            ID: {user.id.slice(0, 8)}...
          </span>
        </div>

        {/* Profile Hero Header */}
        <ProfileHeader
          user={user}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        {/* Role-specific profile card */}
        {user.customer_profile && (
          <CustomerProfileCard
            profile={user.customer_profile}
            onProfileUpdated={refreshSession}
          />
        )}

        {user.vendor_profile && (
          <VendorProfileCard profile={user.vendor_profile} />
        )}

        {/* Security / Change Password */}
        <ChangePasswordForm />
      </div>
    </div>
  );
}
