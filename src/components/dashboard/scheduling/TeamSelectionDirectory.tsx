'use client'

import React, { useState, useMemo } from 'react'
import { 
  Search, Check, User, AlertTriangle, CheckCircle2, ShieldCheck, 
  Car, Users, ChevronDown 
} from 'lucide-react'
import { ProfileItem, ScheduleItem, CasualHelperItem, formatLocalDate } from './types'

interface TeamSelectionDirectoryProps {
  profiles: ProfileItem[]
  casualHelpers?: CasualHelperItem[]
  selectedTechIds: string[]
  onToggleTech: (id: string) => void
  leadTechId: string
  onSelectLead: (id: string) => void
  targetDate?: string
  startTime?: string
  endTime?: string
  existingSchedules?: ScheduleItem[]
  requireLead?: boolean
  hideCasualHelpers?: boolean
}

type RoleFilter = 'all' | 'technician' | 'senior' | 'driver' | 'helper'

export default function TeamSelectionDirectory({
  profiles,
  casualHelpers = [],
  selectedTechIds,
  onToggleTech,
  leadTechId,
  onSelectLead,
  targetDate,
  startTime,
  endTime,
  existingSchedules = [],
  requireLead = true,
  hideCasualHelpers = false
}: TeamSelectionDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  // Calculate conflicts for each technician based on targetDate and existingSchedules
  const techConflictMap = useMemo(() => {
    const map = new Map<string, { hasConflict: boolean; reason: string }>()

    if (!targetDate) return map

    profiles.forEach(p => {
      // Find overlapping schedules for this technician
      const conflicts = existingSchedules.filter(s => {
        if (s.status === 'cancelled') return false
        // Check if technician is assigned as lead or in crew
        const isAssigned = s.technician_id === p.id || 
          s.senior_partner_id === p.id ||
          s.schedule_crew_assignments?.some(c => c.technician_id === p.id && c.status === 'active')

        if (!isAssigned) return false

        // Date check
        const sStart = new Date(s.start_time)
        const sDateStr = formatLocalDate(sStart)
        if (sDateStr !== targetDate) return false

        // If times provided, check overlap
        if (startTime && endTime && s.end_time) {
          const sEnd = new Date(s.end_time)
          const targetStart = new Date(`${targetDate}T${startTime}:00`)
          const targetEnd = new Date(`${targetDate}T${endTime}:00`)

          // Overlap: (targetStart < sEnd) && (targetEnd > sStart)
          if (targetStart < sEnd && targetEnd > sStart) {
            return true
          }
          return false
        }

        return true // same date conflict
      })

      if (conflicts.length > 0) {
        const c = conflicts[0]
        const sTime = new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const eTime = c.end_time ? new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        map.set(p.id, {
          hasConflict: true,
          reason: `Already assigned to ${c.client_name || 'job'} (${sTime}${eTime ? ' – ' + eTime : ''})`
        })
      } else {
        map.set(p.id, {
          hasConflict: false,
          reason: 'No overlapping assignments'
        })
      }
    })

    return map
  }, [profiles, existingSchedules, targetDate, startTime, endTime])

  // Filtered Technicians
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      // Search match
      const nameMatch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      if (!nameMatch) return false

      // Role filter match
      if (roleFilter === 'all') return true
      if (roleFilter === 'senior') return p.technician_level === 'senior'
      if (roleFilter === 'technician') return p.technician_level === 'technician' && p.role === 'technician'
      if (roleFilter === 'driver') return p.is_driver === true
      if (roleFilter === 'helper') return p.technician_level === 'helper' || p.role === 'helper'
      return true
    })
  }, [profiles, searchQuery, roleFilter])

  // Selected crew members info for the Team Lead selector
  const selectedProfiles = useMemo(() => {
    return profiles.filter(p => selectedTechIds.includes(p.id))
  }, [profiles, selectedTechIds])

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          Search technicians
        </label>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by technician name..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Filter by technician type */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          Filter by technician type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all', label: 'All' },
            { key: 'technician', label: 'Technician' },
            { key: 'senior', label: 'Senior' },
            { key: 'driver', label: 'Driver' },
            { key: 'helper', label: 'Helper' }
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setRoleFilter(f.key as RoleFilter)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                roleFilter === f.key
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Technician List Header */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          Technicians
        </span>
        <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
          {selectedTechIds.length} selected
        </span>
      </div>

      {/* Technician Directory Cards with Checkboxes */}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {filteredProfiles.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No technicians match your search or filter.
          </div>
        ) : (
          filteredProfiles.map(tech => {
            const isSelected = selectedTechIds.includes(tech.id)
            const conflictInfo = techConflictMap.get(tech.id)
            const hasConflict = conflictInfo?.hasConflict ?? false
            const isSenior = tech.technician_level === 'senior'
            const isLead = leadTechId === tech.id

            return (
              <div
                key={tech.id}
                onClick={() => onToggleTech(tech.id)}
                className={`flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/80 shadow-2xs'
                    : 'bg-white dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Left: Avatar + Details */}
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isSenior 
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {isSenior ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {tech.full_name}
                      </span>

                      {/* Rank Badge */}
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isSenior 
                          ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {isSenior ? 'Senior Technician' : 'Technician'}
                      </span>

                      {/* Driver Badge */}
                      {tech.is_driver && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Car className="w-2.5 h-2.5" />
                          <span>Driver</span>
                        </span>
                      )}

                      {/* Team Lead Pill */}
                      {isLead && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500 text-white shadow-2xs">
                          ★ Team Lead
                        </span>
                      )}
                    </div>

                    {/* Conflict & Availability Status */}
                    <div className="flex items-center gap-1 text-[11px]">
                      {hasConflict ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {conflictInfo?.reason}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Available • {conflictInfo?.reason || 'Available for selected time'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Tactile Checkbox */}
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mt-1 ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400'
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pinned Team Lead Selector (Populated from Selected Crew) */}
      {requireLead && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
          <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
            <span>Team lead</span>
            {leadTechId && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Designated Lead
              </span>
            )}
          </label>

          {selectedProfiles.length === 0 ? (
            <div className="p-3 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700">
              Select at least one technician above to assign a team lead.
            </div>
          ) : (
            <div className="relative">
              <select
                value={leadTechId}
                onChange={(e) => onSelectLead(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs appearance-none cursor-pointer"
              >
                <option value="">-- Choose lead from selected crew --</option>
                {selectedProfiles.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name} — {tech.technician_level === 'senior' ? 'Senior Technician' : 'Technician'}{tech.is_driver ? ' (Driver)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          )}

          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Choose the lead explicitly from the selected crew, rather than requiring the coordinator to choose from recommended cards first.
          </p>
        </div>
      )}
    </div>
  )
}
