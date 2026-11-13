'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { LogOut, User as UserIcon, Calendar } from 'lucide-react';

export function DashboardHeader() {
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (!user) return 'EM';
    const first = user.first_name ? user.first_name[0] : '';
    const last = user.last_name ? user.last_name[0] : '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return user.username ? user.username.slice(0, 2).toUpperCase() : 'EM';
  };

  const displayName = () => {
    if (!user) return 'User';
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.username;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#381421] text-white border-b border-[#5C2337] px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <Link href="/services" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#762D46] border border-[#A84A63] flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-[#8D3654] transition-colors">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">Event Manager</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-[#421827] border border-[#5C2337] rounded-full py-1 px-3 shadow-inner">
          <div className="w-7 h-7 rounded-full bg-[#762D46] text-[#FBF7F8] flex items-center justify-center text-xs font-semibold">
            {getInitials()}
          </div>
          <div className="hidden sm:block text-left pr-1">
            <p className="text-xs font-medium text-stone-200 leading-none">{displayName()}</p>
            <p className="text-[10px] text-stone-400 capitalize leading-tight mt-0.5">{user?.user_type?.toLowerCase() || 'Member'}</p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          aria-label="Sign out"
          title="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-[#5C2337]/60 hover:bg-[#762D46] rounded-md transition-all border border-[#762D46]/40 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
