'use client';

import React from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Plus,
  Layers,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';

export default function ResearchSurveysPage() {
  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#421827] via-[#5C2337] to-[#762D46] text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#F4E5EA] border border-white/15">
              <ClipboardList className="w-3.5 h-3.5 text-[#F4E5EA]" />
              Audience Intelligence & Studies
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Research & Audience Surveys
            </h1>
            <p className="text-sm text-stone-200 leading-relaxed">
              Design tailored questionnaires, assess event market readiness, gather pre-event attendee preferences, and monitor survey respondent demographics.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/surveys/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#762D46] hover:bg-[#FBF7F8] font-semibold text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#762D46]" />
              <span>Create Survey</span>
            </Link>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-[#A84A63]/30 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Surveys Overview Shell */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F8EFF2]">
          <div>
            <h2 className="text-lg font-bold text-[#30232A]">
              Survey Management & Linked Projects
            </h2>
            <p className="text-xs sm:text-sm text-[#75666D] mt-0.5">
              Surveys are managed globally across all projects or within individual Event Project workspaces.
            </p>
          </div>
          <Link
            href="/surveys"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#762D46] hover:text-[#542037] hover:underline"
          >
            <span>Go to Survey Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="py-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#F4E5EA] text-[#762D46] mx-auto flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-8 h-8 text-[#A84A63]" />
          </div>
          <h3 className="text-base font-bold text-[#30232A] mb-1">
            Access Audience Surveys
          </h3>
          <p className="text-xs sm:text-sm text-[#75666D] leading-relaxed mb-6">
            View all your created questionnaires, check response metrics, configure respondent eligibility, and create new surveys for your Event Projects.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/surveys"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              <span>View All Surveys</span>
            </Link>
            <Link
              href="/surveys/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-[#30232A] text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Survey</span>
            </Link>
            <Link
              href="/projects"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Browse Projects</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
