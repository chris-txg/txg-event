'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { projectClientService } from '@/features/projects/services/projectClientService';
import { ProjectStatus } from '@/features/projects/types/project.types';
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  FileText,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['projects', { page, status: statusFilter === 'all' ? undefined : statusFilter, search: searchTerm }],
    queryFn: async () => {
      const res = await projectClientService.getProjects({
        page,
        page_size: 12,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm ? searchTerm.trim() : undefined,
      });

      if (!res.ok) {
        throw new Error(
          (typeof res.error === 'object' && res.error && 'detail' in res.error
            ? String((res.error as { detail: unknown }).detail)
            : 'Failed to fetch projects')
        );
      }
      return res.data;
    },
  });

  const projects = response?.results || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.total_pages || 1;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const getStatusBadge = (status: ProjectStatus) => {
    if (status === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Draft
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        Created
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9DDE1]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F4E5EA] text-[#762D46] mb-2">
            <FolderKanban className="w-3.5 h-3.5 text-[#A84A63]" />
            Event Portfolio
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#30232A] tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-[#75666D] mt-1">
            Manage your corporate event initiatives, drafts, and active research operations.
          </p>
        </div>

        <div>
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white font-semibold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E9DDE1] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-[#75666D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name, city, or category..."
            className="w-full pl-9 pr-24 py-2 text-sm bg-[#FBF7F8] border border-[#E9DDE1] rounded-lg text-[#30232A] placeholder-[#75666D] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46] transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#762D46] hover:bg-[#542037] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Filter className="w-4 h-4 text-[#75666D]" />
          <span className="text-xs font-medium text-[#75666D]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium bg-[#FBF7F8] border border-[#E9DDE1] text-[#30232A] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#762D46] cursor-pointer"
          >
            <option value="all">All Projects</option>
            <option value="created">Created</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-[#75666D] mt-3">Loading projects...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-red-900">Failed to load projects</h3>
          <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">
            {error instanceof Error ? error.message : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9DDE1] p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#F4E5EA] text-[#762D46] mx-auto flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-[#A84A63]" />
          </div>
          <h3 className="text-lg font-bold text-[#30232A] mb-1">
            {searchTerm || statusFilter !== 'all' ? 'No matching projects' : 'No projects created yet'}
          </h3>
          <p className="text-sm text-[#75666D] mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or clear the filters to see more projects.'
              : 'Start your event management journey by creating your first event project.'}
          </p>
          {searchTerm || statusFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPage(1);
              }}
              className="px-4 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg cursor-pointer"
            >
              Clear Filters
            </button>
          ) : (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Project</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group bg-white rounded-2xl p-6 border border-[#E9DDE1] hover:border-[#762D46] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-medium text-[#75666D] truncate">
                      {project.event_segment || 'General Event'}
                    </span>
                    {getStatusBadge(project.status)}
                  </div>

                  <h3 className="text-base font-bold text-[#30232A] group-hover:text-[#762D46] transition-colors line-clamp-1 mb-2">
                    {project.project_name}
                  </h3>

                  <div className="space-y-2 mt-4 text-xs text-[#75666D]">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-3.5 h-3.5 text-[#A84A63] shrink-0" />
                      <span className="truncate">{project.event_category || 'Uncategorized'}</span>
                    </div>

                    {(project.event_city || project.event_country) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#A84A63] shrink-0" />
                        <span className="truncate">
                          {[project.event_city, project.event_country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    {project.proposed_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#A84A63] shrink-0" />
                        <span>Proposed: {project.proposed_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F8EFF2] flex items-center justify-between text-xs font-semibold text-[#762D46]">
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-[#E9DDE1]">
              <p className="text-xs text-[#75666D]">
                Showing page <span className="font-semibold text-[#30232A]">{page}</span> of{' '}
                <span className="font-semibold text-[#30232A]">{totalPages}</span> ({totalCount} total)
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E9DDE1] rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8EFF2] cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E9DDE1] rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8EFF2] cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
