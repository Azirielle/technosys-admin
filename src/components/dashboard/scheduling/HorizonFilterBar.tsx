'use client'

import React from 'react'
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Search, List, LayoutGrid, Filter, Check, Wrench, PlaneTakeoff, Building2, X
} from 'lucide-react'
import { HorizonGranularity, ViewMode, AssignmentTypeFilter } from './types'

interface HorizonFilterBarProps {
  currentDate: Date
  onDateChange: (d: Date) => void
  granularity: HorizonGranularity
  onGranularityChange: (g: HorizonGranularity) => void
  assignmentTypeFilter: AssignmentTypeFilter
  onAssignmentTypeFilterChange: (t: AssignmentTypeFilter) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  showCancelled: boolean
  onToggleShowCancelled: (val: boolean) => void
  totalCount: number
}

export default function HorizonFilterBar({
  currentDate,
  onDateChange,
  granularity,
  onGranularityChange,
  assignmentTypeFilter,
  onAssignmentTypeFilterChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showCancelled,
  onToggleShowCancelled,
  totalCount
}: HorizonFilterBarProps) {

  // Date Navigation Handlers
  const handlePrev = () => {
    const d = new Date(currentDate)
    if (granularity === 'day') {
      d.setDate(d.getDate() - 1)
    } else if (granularity === 'week') {
      d.setDate(d.getDate() - 7)
    } else if (granularity === 'month' || granularity === 'past') {
      d.setMonth(d.getMonth() - 1)
    }
    onDateChange(d)
  }

  const handleNext = () => {
    const d = new Date(currentDate)
    if (granularity === 'day') {
      d.setDate(d.getDate() + 1)
    } else if (granularity === 'week') {
      d.setDate(d.getDate() + 7)
    } else if (granularity === 'month' || granularity === 'past') {
      d.setMonth(d.getMonth() + 1)
    }
    onDateChange(d)
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  // Format the date label based on granularity
  const formatDateLabel = () => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }
    if (granularity === 'day') {
      return currentDate.toLocaleDateString('en-US', { ...options, weekday: 'short' })
    }
    if (granularity === 'week') {
      const startOfWeek = new Date(currentDate)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
      startOfWeek.setDate(diff)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    if (granularity === 'month' || granularity === 'past') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    return currentDate.toLocaleDateString('en-US', options)
  }

  return (
    <div className="bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-3 mb-3 shadow-xs space-y-2.5">
      {/* Top Layer: Date Selector & Granularity Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Date Navigator Block */}
        <div className="flex items-center gap-1.5 bg-[#FAF9FB] dark:bg-[#2B2C35] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.07] flex-1 max-w-md shadow-xs">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Period"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center font-bold text-xs sm:text-sm text-[#121215] dark:text-[#F4F4F6] font-mono tracking-tight select-none">
            {formatDateLabel()}
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Period"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1 text-xs font-bold text-white bg-[#4D55CC] hover:bg-[#4338CA] rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Today
          </button>
        </div>

        {/* Granularity Tabs (Day / Week / Month / Past) */}
        <div className="flex items-center gap-1 bg-[#EBEAEF] dark:bg-[#262732] p-1 rounded-xl border border-black/[0.04] dark:border-white/[0.05] self-start sm:self-auto">
          {(['day', 'week', 'month', 'past'] as HorizonGranularity[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onGranularityChange(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                granularity === mode
                  ? 'bg-[#FAF9FB] dark:bg-[#1E1F27] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                  : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
              }`}
            >
              {mode === 'past' ? 'Past Records' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Layer: Assignment Type Filter, Search Box & View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
        
        {/* Assignment Type Chips (Pill aesthetic) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#8E8D9A] dark:text-[#7A7C88] uppercase tracking-wider mr-1 hidden md:inline">
            Type:
          </span>

          <button
            type="button"
            onClick={() => onAssignmentTypeFilterChange('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              assignmentTypeFilter === 'all'
                ? 'bg-[#121215] dark:bg-[#F4F4F6] text-white dark:text-[#121215] shadow-xs'
                : 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] border border-black/[0.05] dark:border-white/[0.06]'
            }`}
          >
            All Types
          </button>

          <button
            type="button"
            onClick={() => onAssignmentTypeFilterChange('on_site')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              assignmentTypeFilter === 'on_site'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#575762] dark:text-[#B0B2BD] hover:text-blue-600 border border-black/[0.05] dark:border-white/[0.06]'
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>On-site</span>
          </button>

          <button
            type="button"
            onClick={() => onAssignmentTypeFilterChange('deployment')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              assignmentTypeFilter === 'deployment'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#575762] dark:text-[#B0B2BD] hover:text-purple-600 border border-black/[0.05] dark:border-white/[0.06]'
            }`}
          >
            <PlaneTakeoff className="w-3 h-3" />
            <span>Out-of-Town</span>
          </button>

          <button
            type="button"
            onClick={() => onAssignmentTypeFilterChange('office_duty')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              assignmentTypeFilter === 'office_duty'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#575762] dark:text-[#B0B2BD] hover:text-emerald-600 border border-black/[0.05] dark:border-white/[0.06]'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Office Duty</span>
          </button>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8D9A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs, tech, sites..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Table / Timeline Toggle */}
          <div className="flex items-center bg-[#EBEAEF] dark:bg-[#262732] p-1 rounded-xl border border-black/[0.04] dark:border-white/[0.05] shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              aria-label="Table List View"
              title="Table List View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#FAF9FB] dark:bg-[#1E1F27] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                  : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('timeline')}
              aria-label={granularity === 'month' ? "Month Capacity Calendar" : "Timeline Gantt View"}
              title={granularity === 'month' ? "Month Capacity Calendar" : "Timeline Gantt View"}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-[#FAF9FB] dark:bg-[#1E1F27] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                  : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
              }`}
            >
              {granularity === 'month' ? (
                <CalendarIcon className="w-3.5 h-3.5" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Show Cancelled Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-[#575762] dark:text-[#B0B2BD] select-none cursor-pointer pl-1 hidden lg:flex">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => onToggleShowCancelled(e.target.checked)}
              className="rounded border-black/20 dark:border-white/20 text-[#4D55CC] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="font-medium text-[11px]">Cancelled</span>
          </label>
        </div>

      </div>
    </div>
  )
}
