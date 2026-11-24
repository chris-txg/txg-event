'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}: PaginationProps) {
  if (totalCount === 0) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Generate visible page numbers (max 5 around current page)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#FDFBFB] border-t border-[#F8EFF2] text-xs text-stone-600 select-none">
      {/* Items Summary & Page Size Selector */}
      <div className="flex flex-wrap items-center justify-between w-full sm:w-auto gap-2">
        <span className="text-[11px] sm:text-xs text-stone-500">
          Showing <strong className="font-semibold text-stone-900">{startItem}</strong>–<strong className="font-semibold text-stone-900">{endItem}</strong> of{' '}
          <strong className="font-semibold text-stone-900">{totalCount}</strong>
        </span>

        <div className="flex items-center gap-1.5 border-l border-stone-200 pl-2.5 sm:ml-2">
          <span className="text-[11px] text-stone-400">Rows:</span>
          <select
            value={pageSize}
            disabled={isLoading}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs font-semibold rounded-lg border border-stone-200 bg-white px-2 py-1 text-[#421827] focus:outline-none focus:border-[#762D46] focus:ring-1 focus:ring-[#762D46]/20 cursor-pointer disabled:opacity-50"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center overflow-x-auto py-0.5">
        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1 || isLoading}
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageItem, idx) => {
            if (pageItem === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-stone-400 font-bold">
                  &hellip;
                </span>
              );
            }

            const pageNum = Number(pageItem);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`min-w-[28px] h-7 px-1.5 sm:px-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#762D46] text-white shadow-xs'
                    : 'bg-white hover:bg-[#F4E5EA]/50 text-stone-700 border border-stone-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages || isLoading}
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
