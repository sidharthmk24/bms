"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dropdown } from '@/components/Dropdown';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers to display with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-neutral-200/80 ${className}`}
    >
      {/* Entry Counter */}
      <div className="text-xs text-neutral-500 font-medium">
        {totalItems === 0 ? (
          <span>No records to display</span>
        ) : (
          <span>
            Showing <strong className="text-black font-bold">{startItem}</strong> to{' '}
            <strong className="text-black font-bold">{endItem}</strong> of{' '}
            <strong className="text-black font-bold">{totalItems}</strong> entries
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Page Size Selector via Dropdown Component */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
            <span className="shrink-0">Per page:</span>
            <div className="w-20">
              <Dropdown
                value={String(pageSize)}
                onChange={(val) => onPageSizeChange(Number(val))}
                options={pageSizeOptions.map((opt) => ({
                  value: String(opt),
                  label: String(opt),
                }))}
                selectClassName="!py-1 !px-2.5 !rounded-xl !text-xs font-bold text-black border-neutral-300 bg-white shadow-none hover:border-neutral-400"
              />
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            aria-label="Previous page"
            className="inline-flex items-center justify-center p-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs text-neutral-400 font-medium select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = p as number;
            const isActive = pageNum === safeCurrentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] h-8 px-2 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'text-neutral-700 hover:bg-neutral-100 border border-transparent hover:border-neutral-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            aria-label="Next page"
            className="inline-flex items-center justify-center p-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
