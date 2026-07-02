"use client"
import React from 'react'
import { ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  itemNamePlural?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemNamePlural = 'items'
}: PaginationProps) {
  if (totalPages <= 1) return null

  const startIndex = (currentPage - 1) * itemsPerPage

  // Generate page numbers, handle ellipsis for large page sizes
  const pages = []
  const maxVisiblePages = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-xs text-zinc-500 font-medium">
        Showing <span className="font-semibold text-zinc-900">{totalItems === 0 ? 0 : startIndex + 1}</span> to{" "}
        <span className="font-semibold text-zinc-900">
          {Math.min(startIndex + itemsPerPage, totalItems)}
        </span>{" "}
        of <span className="font-semibold text-zinc-900">{totalItems}</span> {itemNamePlural}
      </p>
      
      <div className="flex items-center gap-1.5 font-sans">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-zinc-600 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
          title="Previous Page"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {startPage > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                className="min-w-9 h-9 px-2.5 rounded-xl text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer flex items-center justify-center border bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900"
              >
                1
              </button>
              {startPage > 2 && <span className="text-zinc-400 text-xs px-1 select-none font-extrabold">...</span>}
            </>
          )}

          {pages.map((page) => {
            const isCurrent = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`min-w-9 h-9 px-2.5 rounded-xl text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer flex items-center justify-center border ${
                  isCurrent
                    ? "bg-indigo-650 border-indigo-650 text-white shadow-sm"
                    : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {page}
              </button>
            )
          })}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="text-zinc-400 text-xs px-1 select-none font-extrabold">...</span>}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className="min-w-9 h-9 px-2.5 rounded-xl text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer flex items-center justify-center border bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-zinc-605 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
