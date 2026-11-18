'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F8]">
      <DashboardHeader />
      <div className="flex flex-1">
        <Suspense fallback={<aside className="w-64 bg-[#421827] border-r border-[#5C2337] min-h-[calc(100vh-57px)] shrink-0" />}>
          <DashboardSidebar />
        </Suspense>
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
