'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Plus,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export default function ResearchSurveysPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-8 animate-fadeIn">
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
            {/* Non-functional Create Survey placeholder */}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#762D46] hover:bg-[#FBF7F8] font-semibold text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#762D46]" />
              <span>Create Survey</span>
            </button>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-[#A84A63]/30 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Projects Container Shell */}
      <div className="bg-white rounded-2xl border border-[#E9DDE1] p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F8EFF2]">
          <div>
            <h2 className="text-lg font-bold text-[#30232A]">
              Survey Management & Linked Projects
            </h2>
            <p className="text-xs sm:text-sm text-[#75666D] mt-0.5">
              Surveys are orchestrated under dedicated Event Projects.
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#762D46] hover:text-[#542037] hover:underline"
          >
            <span>View All Projects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Reserved Empty State */}
        <div className="py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#F4E5EA] text-[#762D46] mx-auto flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-8 h-8 text-[#A84A63]" />
          </div>
          <h3 className="text-base font-bold text-[#30232A] mb-1">
            No Active Surveys Yet
          </h3>
          <p className="text-xs sm:text-sm text-[#75666D] leading-relaxed mb-6">
            Survey campaigns are authored directly inside individual projects. Create or select an event project to associate questionnaire models and launch participant surveys.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/projects/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event Project</span>
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

      {/* Placeholder Modal for Create Survey */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-[#421827] text-white border border-[#5C2337] rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-md hover:bg-[#5C2337] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#5C2337] flex items-center justify-center text-[#F4E5EA]">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Create Survey Notice</h3>
            </div>
            <p className="text-sm text-stone-300 mb-5 leading-relaxed">
              Survey authoring is linked to a specific Event Project workspace. Please select or create an Event Project first, where questionnaire builders and survey campaigns will be enabled.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <Link
                href="/projects"
                className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#762D46] hover:bg-[#8D3654] text-white rounded-lg transition-colors"
              >
                Go to Projects
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
