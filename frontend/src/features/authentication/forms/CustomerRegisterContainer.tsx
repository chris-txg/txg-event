'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { B2CRegisterForm } from '@/features/authentication/forms/B2CRegisterForm';
import { B2BRegisterForm } from '@/features/authentication/forms/B2BRegisterForm';
import { User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function CustomerRegisterContainer() {
  const [activeTab, setActiveTab] = useState<'B2C' | 'B2B'>('B2C');

  return (
    <Card className="w-full">
      <CardHeader className="mb-4">
        <CardTitle>Create Organizer Account</CardTitle>
        <CardDescription>
          Plan events with verified vendors and automated budgeting
        </CardDescription>
      </CardHeader>

      {/* Segmented Pill Selector */}
      <div className="grid grid-cols-2 p-1 mb-6 rounded-2xl bg-stone-100 border border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab('B2C')}
          className={cn(
            'flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200',
            activeTab === 'B2C'
              ? 'bg-white text-[#762D46] shadow-sm'
              : 'text-stone-500 hover:text-[#421827]'
          )}
        >
          <User className="h-3.5 w-3.5" />
          <span>Individual (B2C)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('B2B')}
          className={cn(
            'flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200',
            activeTab === 'B2B'
              ? 'bg-white text-[#762D46] shadow-sm'
              : 'text-stone-500 hover:text-[#421827]'
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Corporate (B2B)</span>
        </button>
      </div>

      {activeTab === 'B2C' ? <B2CRegisterForm /> : <B2BRegisterForm />}

      <div className="pt-5 mt-5 text-center text-xs text-stone-500 border-t border-stone-100">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-bold text-[#762D46] hover:text-[#A84A63] underline underline-offset-4 transition-colors"
        >
          Sign in here
        </Link>
      </div>
    </Card>
  );
}
