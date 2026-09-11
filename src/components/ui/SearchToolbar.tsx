"use client"
import React, { ReactNode } from "react"
import { Search, X } from "lucide-react"

interface SearchToolbarProps {
  search?: string
  onSearchChange?: (value: string) => void
  placeholder?: string
  filters?: ReactNode
  actions?: ReactNode
  totalCount?: number
  countLabel?: string
  className?: string
}

export default function SearchToolbar({
  search = "",
  onSearchChange,
  placeholder = "Search records...",
  filters,
  actions,
  totalCount,
  countLabel = "items",
  className = ""
}: SearchToolbarProps) {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 mb-4 transition-colors ${className}`}
    >
      {/* Search Input and Filters Area */}
      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
        {onSearchChange && (
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {filters && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters}
          </div>
        )}
      </div>

      {/* Right Side Actions and Counters */}
      <div className="flex items-center gap-3 shrink-0">
        {typeof totalCount === "number" && (
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span>{" "}
            {countLabel}
          </span>
        )}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
