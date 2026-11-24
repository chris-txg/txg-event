'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/authentication/context/AuthContext';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F8]">
      <DashboardHeader onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
      <div className="flex flex-1">
        <Suspense fallback={<aside className="hidden lg:flex w-64 bg-[#421827] border-r border-[#5C2337] min-h-[calc(100vh-57px)] shrink-0" />}>
          <DashboardSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        </Suspense>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
