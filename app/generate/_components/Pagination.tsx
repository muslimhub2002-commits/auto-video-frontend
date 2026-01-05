'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Previous Button */}
      <button
        type="button"
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="group relative px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
      >
        <span className="flex items-center gap-1.5 text-gray-600 group-hover:text-indigo-600 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1.5">
        {(() => {
          const pages: (number | string)[] = [];
          const showEllipsisStart = currentPage > 3;
          const showEllipsisEnd = currentPage < totalPages - 2;

          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
          } else {
            pages.push(1);
            if (showEllipsisStart) pages.push('start-ellipsis');
            
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            
            if (showEllipsisEnd) pages.push('end-ellipsis');
            pages.push(totalPages);
          }

          return pages.map((pageNum) => {
            if (typeof pageNum === 'string') {
              return (
                <span key={pageNum} className="px-2 text-gray-400 text-xs">
                  ···
                </span>
              );
            }
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => pageNum !== currentPage && onPageChange(pageNum)}
                className={`relative min-w-[36px] h-9 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  pageNum === currentPage
                    ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 scale-105'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-sm'
                }`}
              >
                {pageNum}
                {pageNum === currentPage && (
                  <span className="absolute inset-0 rounded-lg bg-white/20 animate-pulse" />
                )}
              </button>
            );
          });
        })()}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="group relative px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
      >
        <span className="flex items-center gap-1.5 text-gray-600 group-hover:text-indigo-600 transition-colors">
          Next
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>
    </div>
  );
}
