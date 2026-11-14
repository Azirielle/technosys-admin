// Pagination: "Showing 1 to 20 of 84" and page buttons, shown under a table.
"use client"
import { cx } from "./cx"
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
  className
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

  const pageButton = (active: boolean) =>
    cx(
      "min-w-8 h-8 px-2 rounded-pill text-caption font-medium tabular-nums transition-colors cursor-pointer",
      "focus-visible:outline-2 focus-visible:outline-focus",
      active ? "bg-action text-on-action" : "text-ink-2 hover:bg-surface-soft hover:text-ink"
    )
  const arrowButton =
    "size-8 rounded-pill flex items-center justify-center text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-focus"

  return (
    <div className={cx("flex flex-col items-center justify-between gap-3 border-t border-line px-card py-3 sm:flex-row", className)}>
      <p className="text-caption text-ink-2">
        Showing <span className="font-medium text-ink tabular-nums">{startIndex}</span> to{" "}
        <span className="font-medium text-ink tabular-nums">{endIndex}</span> of{" "}
        <span className="font-medium text-ink tabular-nums">{totalItems}</span> {itemNamePlural}
      </p>

      <div className="flex select-none items-center gap-1">
        <button type="button" aria-label="Previous page" onClick={() => onPageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} className={arrowButton}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        {startPage > 1 && (
          <>
            <button type="button" onClick={() => onPageChange(1)} className={pageButton(false)}>1</button>
            {startPage > 2 && <span className="px-1 text-caption text-ink-3">…</span>}
          </>
        )}

        {pages.map((page) => (
          <button key={page} type="button" aria-current={page === currentPage ? "page" : undefined} onClick={() => onPageChange(page)} className={pageButton(page === currentPage)}>
            {page}
          </button>
        ))}

        {endPage < safeTotalPages && (
          <>
            {endPage < safeTotalPages - 1 && <span className="px-1 text-caption text-ink-3">…</span>}
            <button type="button" onClick={() => onPageChange(safeTotalPages)} className={pageButton(false)}>{safeTotalPages}</button>
          </>
        )}

        <button type="button" aria-label="Next page" onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))} disabled={currentPage === safeTotalPages || totalItems === 0} className={arrowButton}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
