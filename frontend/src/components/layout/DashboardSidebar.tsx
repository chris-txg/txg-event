'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layers,
  ClipboardList,
  FolderKanban,
  BarChart3,
  FileText,
  Settings,
  ChevronDown,
  Info,
  X,
} from 'lucide-react';

export function DashboardSidebar() {
  const pathname = usePathname();
  const [servicesExpanded, setServicesExpanded] = useState(true);
  const [modalFeature, setModalFeature] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<string>('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentYear(String(new Date().getFullYear()));
  }, []);

  const isServicesActive = pathname.startsWith('/services');
  const isResearchSurveysActive = pathname === '/services/research-surveys';
  const isProjectsActive = pathname.startsWith('/projects');

  const openPlaceholderModal = (featureName: string) => {
    setModalFeature(featureName);
  };

  const closePlaceholderModal = () => {
    setModalFeature(null);
  };

  return (
    <>
      <aside className="w-64 bg-[#421827] text-stone-200 border-r border-[#5C2337] min-h-[calc(100vh-57px)] flex flex-col justify-between py-5 px-3 select-none">
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold tracking-wider uppercase text-stone-400">
              Workspace
            </p>

            {/* Services Parent Item */}
            <div>
              <button
                onClick={() => setServicesExpanded(!servicesExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  isServicesActive && !isResearchSurveysActive
                    ? 'bg-[#5C2337] text-white shadow-sm'
                    : 'text-stone-300 hover:bg-[#5C2337]/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[#A84A63]" />
                  <Link
                    href="/services"
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Services
                  </Link>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    servicesExpanded ? 'rotate-180 text-stone-300' : 'text-stone-400'
                  }`}
                />
              </button>

              {/* Sub-item: Research & Audience Surveys */}
              {servicesExpanded && (
                <div className="ml-4 pl-3 border-l border-[#5C2337] mt-1 space-y-1">
                  <Link
                    href="/services/research-surveys"
                    className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      isResearchSurveysActive
                        ? 'bg-[#762D46] text-white shadow-sm'
                        : 'text-stone-300 hover:bg-[#5C2337]/40 hover:text-white'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-stone-300" />
                    <span>Research & Surveys</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Projects Active Item */}
            <Link
              href="/projects"
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isProjectsActive
                  ? 'bg-[#5C2337] text-white shadow-sm'
                  : 'text-stone-300 hover:bg-[#5C2337]/50 hover:text-white'
              }`}
            >
              <FolderKanban className="w-4 h-4 text-[#A84A63]" />
              <span>Projects</span>
            </Link>
          </div>

          {/* Placeholder Section */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold tracking-wider uppercase text-stone-400">
              Insights & Config
            </p>

            <button
              onClick={() => openPlaceholderModal('Analytics')}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#5C2337]/30 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-stone-400" />
                <span>Analytics</span>
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-[#5C2337] text-stone-300 px-1.5 py-0.5 rounded">
                Soon
              </span>
            </button>

            <button
              onClick={() => openPlaceholderModal('Reports')}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#5C2337]/30 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-stone-400" />
                <span>Reports</span>
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-[#5C2337] text-stone-300 px-1.5 py-0.5 rounded">
                Soon
              </span>
            </button>

            <button
              onClick={() => openPlaceholderModal('Profile Settings')}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#5C2337]/30 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-stone-400" />
                <span>Profile Settings</span>
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-[#5C2337] text-stone-300 px-1.5 py-0.5 rounded">
                Soon
              </span>
            </button>
          </div>
        </div>

        <div className="px-3 py-3 border-t border-[#5C2337] text-[11px] text-stone-400">
          TecnolynxGlobal &copy; {currentYear}
        </div>
      </aside>

      {/* Placeholder Modal */}
      {modalFeature && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-[#421827] text-white border border-[#5C2337] rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={closePlaceholderModal}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-md hover:bg-[#5C2337] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#5C2337] flex items-center justify-center text-[#F4E5EA]">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">{modalFeature}</h3>
            </div>
            <p className="text-sm text-stone-300 mb-5">
              The {modalFeature} module is currently under active development and will be available in an upcoming release.
            </p>
            <div className="flex justify-end">
              <button
                onClick={closePlaceholderModal}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#762D46] hover:bg-[#8D3654] text-white rounded-lg transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
