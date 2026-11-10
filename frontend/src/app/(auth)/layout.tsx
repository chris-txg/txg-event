import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-[#FBF7F8]">
      {/* Top back navigation */}
      <div className="w-full max-w-[1020px] mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#762D46] hover:text-[#A84A63] transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-[1020px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Branded Showcase Panel */}
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 text-white flex flex-col justify-between lg:col-span-5 bg-gradient-to-br from-[#421827] via-[#5C2337] to-[#7B354F] shadow-[0_20px_50px_rgba(66,24,39,0.22)] border border-white/10 min-h-[420px]">
          {/* Subtle concentric circles */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 w-72 h-72 rounded-full border border-white/15 shadow-[0_0_0_32px_rgba(255,255,255,0.03),0_0_0_64px_rgba(255,255,255,0.02)]"
          />

          {/* Brand header */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#421827] grid place-items-center font-black text-lg shadow-md">
                E
              </div>
              <span className="font-extrabold text-white text-xl tracking-tight">
                Event Manager
              </span>
            </Link>

            <div className="mt-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm border border-white/10">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>Next-Gen Event Intelligence</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                One Platform. Every Event.
              </h1>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Connect with verified vendors, manage budgets, automate workflows, and bring your event vision to life.
              </p>
            </div>
          </div>

          {/* Highlights */}
          <div className="relative z-10 my-6 space-y-2.5 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2.5 text-xs text-white/90">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Verified corporate & personal event tools</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/90">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Trusted vendors across all event categories</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/90">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Strict enterprise-grade security & audit logging</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-white/60">
            © 2026 Event Manager. All rights reserved.
          </div>
        </div>

        {/* Right Content Form Panel */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
