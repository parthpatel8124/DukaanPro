import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CustomSelect } from './CustomSelect';

interface PaginationControlsProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  totalItems: number;
  pageSizeOptions?: number[];
  mobileVisibleCount?: number;
  onMobileLoadMore?: () => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  pageSizeOptions = [5, 10, 15, 20],
  mobileVisibleCount = 20,
  onMobileLoadMore
}) => {
  const { isDarkMode } = useStore();
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const hasMoreMobile = mobileVisibleCount < totalItems;

  useEffect(() => {
    if (!hasMoreMobile || !onMobileLoadMore) return;

    const target = observerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          onMobileLoadMore();
          setTimeout(() => {
            setIsLoadingMore(false);
          }, 350);
        }
      },
      { rootMargin: '150px' }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreMobile, onMobileLoadMore, isLoadingMore, mobileVisibleCount]);

  return (
    <div className="mt-4 space-y-3">
      {/* ── DESKTOP & LAPTOP PAGINATION BAR (>= md screens) ────────────────── */}
      <div className={`hidden md:flex items-center justify-between px-4 py-3 rounded-2xl border shadow-xs transition-all ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white border-slate-200/90 text-slate-700'
      }`}>
        {/* Left: Entries Info & Per-Page Selector */}
        <div className="flex items-center space-x-4 text-xs font-bold">
          <span className="text-slate-500 dark:text-slate-400">
            Showing <span className="font-extrabold text-slate-900 dark:text-white">{startItem}</span> to{' '}
            <span className="font-extrabold text-slate-900 dark:text-white">{endItem}</span> of{' '}
            <span className="font-extrabold text-brand-primary">{totalItems}</span> entries
          </span>

          {/* Per Page Custom Selector */}
          <div className="flex items-center space-x-2 pl-3 border-l border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Per Page:</span>
            <CustomSelect
              value={pageSize.toString()}
              options={pageSizeOptions.map((opt) => ({
                value: opt.toString(),
                label: `${opt} entries`
              }))}
              onChange={(val) => {
                onPageSizeChange(Number(val));
                onPageChange(1);
              }}
              align="left"
              className="w-32"
            />
          </div>
        </div>

        {/* Right: Page Navigation Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* Previous Page */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-xl border text-xs font-extrabold flex items-center space-x-1 transition-all cursor-pointer ${
              currentPage === 1
                ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                : isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {getPageNumbers().map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={idx}
                  onClick={() => onPageChange(p)}
                  className={`w-8.5 h-8.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    currentPage === p
                      ? 'bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20'
                      : isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ) : (
                <span key={idx} className="px-1 text-slate-400 font-extrabold text-xs">
                  ...
                </span>
              )
            )}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className={`p-2 rounded-xl border text-xs font-extrabold flex items-center space-x-1 transition-all cursor-pointer ${
              currentPage >= totalPages
                ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                : isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Next Page"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── MOBILE INFINITE SCROLL SENTINEL & LOADER SPINNER (< md screens) ── */}
      {hasMoreMobile && onMobileLoadMore && (
        <div
          ref={observerRef}
          className="md:hidden py-4 flex items-center justify-center space-x-2 text-slate-500 dark:text-slate-400 text-xs font-extrabold"
        >
          <RefreshCw className="w-4.5 h-4.5 text-brand-primary animate-spin" />
          <span>Loading more entries...</span>
        </div>
      )}
    </div>
  );
};
