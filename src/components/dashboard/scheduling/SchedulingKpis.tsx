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
      case 'past': return 'Earlier'
      default: return 'Today'
    }
  }

  const period = getPeriodLabel()

  return (
    <div className="bg-surface-soft border border-line rounded-card px-4 py-2 mb-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5 transition-all">
      {/* Left Segment: Compact Clickable Telemetry Badges */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
        
        {/* 1. On-site Jobs */}
        <button
          type="button"
          onClick={() => onFilterType?.('on_site')}
          className="flex items-center gap-2 px-3 py-1 rounded-xl hover:bg-surface-soft transition cursor-pointer group"
          title={`Filter: On-site jobs ${period.toLowerCase()}`}
        >
          <span className="w-2 h-2 rounded-full bg-info group-hover:scale-125 transition-transform" />
          <span className="text-ink-2 font-medium text-xs">On-site:</span>
          <span className="font-semibold text-ink tabular-nums text-xs">{onSiteCount}</span>
        </button>

        <span className="text-ink-3 hidden sm:inline select-none">&bull;</span>

        {/* 2. Active Out-of-Town Projects */}
        <button
          type="button"
          onClick={() => onFilterType?.('deployment')}
          className="flex items-center gap-2 px-3 py-1 rounded-xl hover:bg-surface-soft transition cursor-pointer group"
          title={`Filter: Active projects ${period.toLowerCase()}`}
        >
          <span className="w-2 h-2 rounded-full bg-info group-hover:scale-125 transition-transform" />
          <span className="text-ink-2 font-medium text-xs">Out of town:</span>
          <span className="font-semibold text-ink tabular-nums text-xs">{deploymentsCount}</span>
        </button>

        <span className="text-ink-3 hidden sm:inline select-none">&bull;</span>

        {/* 3. Unassigned / Needs a Team */}
        <button
          type="button"
          onClick={() => onFilterType?.('unassigned')}
          className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs transition cursor-pointer ${
 needsTeamCount > 0 
 ? 'bg-warning/15 text-warning font-semibold border border-transparent'
 : 'text-ink-2 hover:bg-surface-soft font-medium'
 }`}
          title={needsTeamCount > 0 ? `${needsTeamCount} jobs require a team` : 'All jobs fully staffed'}
        >
          {needsTeamCount > 0 ? (
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-scrim " />
          )}
          <span>No lead yet:</span>
          <span className="font-semibold tabular-nums">{needsTeamCount}</span>
          {needsTeamCount > 0 && (
            <span className="text-micro text-warning font-semibold tracking-tight hidden md:inline">
              Needs Team
            </span>
          )}
        </button>

        <span className="text-ink-3 hidden sm:inline select-none">&bull;</span>

        {/* 4. Scheduling Conflicts */}
        <button
          type="button"
          onClick={() => onFilterType?.('conflicts')}
          className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs transition cursor-pointer ${
 conflictsCount > 0
 ? 'bg-danger/15 text-danger font-semibold border border-transparent'
 : 'text-ink-2 hover:bg-surface-soft font-medium'
 }`}
          title={conflictsCount > 0 ? `${conflictsCount} crew collisions detected` : 'No scheduling conflicts'}
        >
          {conflictsCount > 0 ? (
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-success" />
          )}
          <span>Double-booked:</span>
          <span className="font-semibold tabular-nums">{conflictsCount}</span>
          {conflictsCount === 0 ? (
            <span className="text-micro text-success font-semibold hidden lg:inline">Clear</span>
          ) : (
            <span className="text-micro text-danger font-semibold hidden lg:inline tracking-tight">Requires Review</span>
          )}
        </button>

      </div>

      {/* Right Segment: Active Horizon Scope Indicator */}
      <div className="flex items-center gap-2 text-micro tabular-nums">
        <span className="px-3 py-1 rounded-full bg-surface-soft text-ink-2 font-semibold border border-line">
          Period: {period}
        </span>
      </div>
    </div>
  )
}
