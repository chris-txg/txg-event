import React from 'react';
import Link from 'next/link';

export default function RespondentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F8] text-[#30232A]">
      {/* Branded Header */}
      <header className="w-full bg-[linear-gradient(108deg,#421827_0%,#572037_55%,#702C46_100%)] text-white shadow-xs border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-base tracking-tight text-white hover:opacity-95 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-white text-[#421827] grid place-items-center font-black text-sm shadow-xs">
              E
            </div>
            <span>Event Manager</span>
          </Link>
          <span className="text-xs text-white/70 font-medium hidden sm:inline">
            Survey Participation
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="w-full py-6 text-center text-xs text-[#75666D] border-t border-[#E9DDE1]/60">
        <p>© 2026 Event Manager. All rights reserved.</p>
      </footer>
    </div>
  );
}
