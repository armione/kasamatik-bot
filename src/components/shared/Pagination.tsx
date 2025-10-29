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
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-btn"
      >
        &larr;
      </button>
      
      <span className="text-sm text-gray-300 px-4 py-2 bg-gray-700/50 rounded-lg">
        Sayfa {currentPage} / {totalPages}
      </span>

      <button
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="pagination-btn"
      >
        &rarr;
      </button>
    </div>
  );
};

export default Pagination;
