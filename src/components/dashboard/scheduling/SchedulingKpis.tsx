'use client'

import React from 'react'
import { Wrench, PlaneTakeoff, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { HorizonGranularity } from './types'

interface SchedulingKpisProps {
  onSiteCount: number
  deploymentsCount: number
  needsTeamCount: number
  conflictsCount: number
  granularity?: HorizonGranularity
  onFilterType?: (type: 'on_site' | 'deployment' | 'unassigned' | 'conflicts') => void
}

export default function SchedulingKpis({
  onSiteCount,
  deploymentsCount,
  needsTeamCount,
  conflictsCount,
  granularity = 'day',
  onFilterType
}: SchedulingKpisProps) {
  const getPeriodLabel = () => {
    switch (granularity) {
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'past': return 'Past Records'
      default: return 'Today'
    }
  }

  const period = getPeriodLabel()

  return (
    <div className="bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl px-4 py-2 mb-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5 transition-all">
      {/* Left Segment: Compact Clickable Telemetry Badges */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
        
        {/* 1. On-site Jobs */}
        <button
          type="button"
          onClick={() => onFilterType?.('on_site')}
          className="flex items-center gap-2 px-3 py-1 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition cursor-pointer group"
          title={`Filter: On-site jobs ${period.toLowerCase()}`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 group-hover:scale-125 transition-transform" />
          <span className="text-[#575762] dark:text-[#B0B2BD] font-medium text-xs">On-site:</span>
          <span className="font-bold text-[#121215] dark:text-[#F4F4F6] font-mono text-xs">{onSiteCount}</span>
        </button>

        <span className="text-black/15 dark:text-white/20 hidden sm:inline select-none">&bull;</span>

        {/* 2. Active Out-of-Town Projects */}
        <button
          type="button"
          onClick={() => onFilterType?.('deployment')}
          className="flex items-center gap-2 px-3 py-1 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition cursor-pointer group"
          title={`Filter: Active projects ${period.toLowerCase()}`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500 group-hover:scale-125 transition-transform" />
          <span className="text-[#575762] dark:text-[#B0B2BD] font-medium text-xs">Active Projects:</span>
          <span className="font-bold text-[#121215] dark:text-[#F4F4F6] font-mono text-xs">{deploymentsCount}</span>
        </button>

        <span className="text-black/15 dark:text-white/20 hidden sm:inline select-none">&bull;</span>

        {/* 3. Unassigned / Needs a Team */}
        <button
          type="button"
          onClick={() => onFilterType?.('unassigned')}
          className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs transition cursor-pointer ${
            needsTeamCount > 0 
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30'
              : 'text-[#575762] dark:text-[#B0B2BD] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-medium'
          }`}
          title={needsTeamCount > 0 ? `${needsTeamCount} jobs require a team` : 'All jobs fully staffed'}
        >
          {needsTeamCount > 0 ? (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20" />
          )}
          <span>Unassigned:</span>
          <span className="font-bold font-mono">{needsTeamCount}</span>
          {needsTeamCount > 0 && (
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-tight hidden md:inline">
              Needs Team
            </span>
          )}
        </button>

        <span className="text-black/15 dark:text-white/20 hidden sm:inline select-none">&bull;</span>

        {/* 4. Scheduling Conflicts */}
        <button
          type="button"
          onClick={() => onFilterType?.('conflicts')}
          className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs transition cursor-pointer ${
            conflictsCount > 0
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/30'
              : 'text-[#575762] dark:text-[#B0B2BD] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-medium'
          }`}
          title={conflictsCount > 0 ? `${conflictsCount} crew collisions detected` : 'No scheduling conflicts'}
        >
          {conflictsCount > 0 ? (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
          <span>Conflicts:</span>
          <span className="font-bold font-mono">{conflictsCount}</span>
          {conflictsCount === 0 ? (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hidden lg:inline">Clear</span>
          ) : (
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hidden lg:inline uppercase tracking-tight">Requires Review</span>
          )}
        </button>

      </div>

      {/* Right Segment: Active Horizon Scope Indicator */}
      <div className="flex items-center gap-2 text-[11px] font-mono">
        <span className="px-3 py-1 rounded-full bg-[#EBEAEF] dark:bg-[#2B2C35] text-[#575762] dark:text-[#B0B2BD] font-bold border border-black/[0.04] dark:border-white/[0.06]">
          Period: {period}
        </span>
      </div>
    </div>
  )
}
