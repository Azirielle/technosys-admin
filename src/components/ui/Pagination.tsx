"use client"
import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  itemNamePlural?: string
  className?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemNamePlural = "records",
  className = ""
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages)
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers, handle ellipsis for large page sizes
  const pages: number[] = []
  const maxVisiblePages = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
  let endPage = Math.min(safeTotalPages, startPage + maxVisiblePages - 1)

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div
      className={`px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors ${className}`}
    >
      <p className="text-zinc-500 dark:text-zinc-400 font-medium">
        Showing <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalItems === 0 ? 0 : startIndex}</span> to{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{endIndex}</span> of{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalItems}</span> {itemNamePlural}
      </p>

      <div className="flex items-center gap-1 font-sans select-none">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* First Page if far away */}
        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="min-w-8 h-8 px-2 rounded-lg text-xs font-semibold border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
            >
              1
            </button>
            {startPage > 2 && (
              <span className="text-zinc-400 dark:text-zinc-500 text-xs px-1 select-none font-bold">
                ...
              </span>
            )}
          </>
        )}

        {/* Visible Page Numbers */}
        {pages.map((page) => {
          const isCurrent = page === currentPage
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer shadow-2xs ${
                isCurrent
                  ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                  : "bg-white dark:bg-zinc-800 border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              {page}
            </button>
          )
        })}

        {/* Last Page if far away */}
        {endPage < safeTotalPages && (
          <>
            {endPage < safeTotalPages - 1 && (
              <span className="text-zinc-400 dark:text-zinc-500 text-xs px-1 select-none font-bold">
                ...
              </span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(safeTotalPages)}
              className="min-w-8 h-8 px-2 rounded-lg text-xs font-semibold border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
            >
              {safeTotalPages}
            </button>
          </>
        )}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
          disabled={currentPage === safeTotalPages || totalItems === 0}
          className="p-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
