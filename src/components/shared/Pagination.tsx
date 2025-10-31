
// src/components/shared/Pagination.tsx
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex justify-center items-center space-x-2">
      <button
        onClick={() => handlePageClick(1)}
        disabled={currentPage === 1}
        className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-700/50 text-white transition-colors hover:bg-gray-600/80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &laquo;
      </button>
      <button
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-700/50 text-white transition-colors hover:bg-gray-600/80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &larr;
      </button>
      
      <span className="text-sm text-gray-300 px-4 py-2 bg-gray-700/50 rounded-lg">
        Sayfa {currentPage} / {totalPages}
      </span>

      <button
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-700/50 text-white transition-colors hover:bg-gray-600/80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &rarr;
      </button>
      <button
        onClick={() => handlePageClick(totalPages)}
        disabled={currentPage === totalPages}
        className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-700/50 text-white transition-colors hover:bg-gray-600/80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &raquo;
      </button>
    </div>
  );
};

export default Pagination;
