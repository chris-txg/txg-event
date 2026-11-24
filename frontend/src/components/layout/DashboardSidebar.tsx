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

export interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ isOpen = false, onClose }: DashboardSidebarProps = {}) {
  const pathname = usePathname();
  const [servicesExpanded, setServicesExpanded] = useState(true);
  const [researchExpanded, setResearchExpanded] = useState(true);
  const [modalFeature, setModalFeature] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<string>('');

  useEffect(() => {
    // Automatically close mobile sidebar on navigation
    if (onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentYear(String(new Date().getFullYear()));
  }, []);

  const isSurveysActive = pathname.startsWith('/surveys');
  const isAnalyticsActive = pathname.startsWith('/analytics');
  const isReportsActive = pathname.startsWith('/reports');
  const isResearchActive = isSurveysActive || isAnalyticsActive || isReportsActive || pathname.startsWith('/services/research-surveys');
  const isServicesActive = pathname.startsWith('/services') || isResearchActive;
  const isProjectsActive = pathname.startsWith('/projects');

  const openPlaceholderModal = (featureName: string) => {
    setModalFeature(featureName);
  };

  const closePlaceholderModal = () => {
    setModalFeature(null);
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full select-none">
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-stone-400">
              Workspace
            </p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation"
                className="lg:hidden p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-[#5C2337] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

            {/* Services Parent Item */}
            <div>
              <button
                onClick={() => setServicesExpanded(!servicesExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  pathname === '/services'
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

              {/* Sub-group under Services: Research & Surveys */}
              {servicesExpanded && (
                <div className="ml-3 pl-3 border-l border-[#5C2337] mt-1 space-y-1">
                  <div>
                    <button
                      type="button"
                      onClick={() => setResearchExpanded(!researchExpanded)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        isResearchActive && !researchExpanded
                          ? 'bg-[#762D46] text-white shadow-sm'
                          : 'text-stone-300 hover:bg-[#5C2337]/40 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-[#A84A63]" />
                        <span>Research & Surveys</span>
                      </div>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          researchExpanded ? 'rotate-180 text-stone-300' : 'text-stone-400'
                        }`}
                      />
                    </button>

                    {/* Sub-items under Research & Surveys: Surveys and Analytics */}
                    {researchExpanded && (
                      <div className="ml-3 pl-2.5 border-l border-[#5C2337]/70 space-y-1 mt-1">
                        <Link
                          href="/surveys"
                          className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            isSurveysActive
                              ? 'bg-[#762D46] text-white shadow-sm font-semibold'
                              : 'text-stone-300 hover:bg-[#5C2337]/40 hover:text-white'
                          }`}
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-stone-300" />
                          <span>Surveys</span>
                        </Link>

                        <Link
                          href="/analytics"
                          className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            isAnalyticsActive
                              ? 'bg-[#762D46] text-white shadow-sm font-semibold'
                              : 'text-stone-300 hover:bg-[#5C2337]/40 hover:text-white'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-stone-300" />
                          <span>Analytics</span>
                        </Link>

                        <Link
                          href="/reports"
                          className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            isReportsActive
                              ? 'bg-[#762D46] text-white shadow-sm font-semibold'
                              : 'text-stone-300 hover:bg-[#5C2337]/40 hover:text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-stone-300" />
                          <span>Reports</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Projects Item (Outside Services) */}
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

          {/* Insights & Config */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold tracking-wider uppercase text-stone-400">
              Insights & Config
            </p>

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
      </div>
    );

  return (
    <>
      {/* Desktop Persistent Sidebar (Pinned on lg screens) */}
      <aside className="hidden lg:flex w-64 bg-[#421827] text-stone-200 border-r border-[#5C2337] min-h-[calc(100vh-57px)] flex-col py-5 px-3 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile & Tablet Drawer (Overlay modal on < lg screens) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <aside className="relative w-72 max-w-[85vw] bg-[#421827] text-stone-200 h-full flex flex-col py-5 px-3 z-10 shadow-2xl overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}

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
