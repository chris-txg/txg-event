'use client';

import React from 'react';
import { User } from '@/features/authentication/types/auth.types';
import { Button } from '@/components/ui/Button';
import { LogOut, ShieldCheck, Clock, Building2, UserCheck, Store } from 'lucide-react';

interface ProfileHeaderProps {
  user: User;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export function ProfileHeader({ user, onLogout, isLoggingOut }: ProfileHeaderProps) {
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';

  const getRoleBadge = () => {
    if (user.user_type === 'VENDOR') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#762D46] text-white">
          <Store className="h-3.5 w-3.5" />
          <span>Vendor Provider</span>
        </span>
      );
    }

    if (user.customer_profile?.customer_type === 'B2B') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#421827] text-white">
          <Building2 className="h-3.5 w-3.5" />
          <span>Corporate (B2B) Organizer</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F4E5EA] text-[#762D46]">
        <UserCheck className="h-3.5 w-3.5" />
        <span>Individual (B2C) Organizer</span>
      </span>
    );
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#421827] via-[#5C2337] to-[#7B354F] p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
      {/* Background radial accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 w-60 h-60 rounded-full border border-white/10"
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white text-[#421827] flex items-center justify-center font-black text-2xl shadow-md shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {user.first_name} {user.last_name}
              </h1>
              {getRoleBadge()}
            </div>
            <p className="text-xs text-white/80">
              @{user.username} • {user.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified Account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                  <Clock className="h-3.5 w-3.5" />
                  Verification Pending
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          isLoading={isLoggingOut}
          className="border-white/30 text-white hover:bg-white/10 active:bg-white/20 self-start sm:self-auto"
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
