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
        <label className="text-xs font-semibold text-ink">
          Search technicians
        </label>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by technician name..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus shadow-2xs"
          />
        </div>
      </div>

      {/* Filter by technician type */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink">
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
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition cursor-pointer ${
 roleFilter === f.key
 ? 'bg-action text-on-action shadow-xs'
 : 'bg-surface-soft text-ink-2 hover:bg-surface-soft '
 }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Technician List Header */}
      <div className="flex items-center justify-between pt-2 border-t border-line">
        <span className="text-xs font-semibold text-ink">
          Technicians
        </span>
        <span className="text-xs tabular-nums font-semibold text-ink ">
          {selectedTechIds.length} selected
        </span>
      </div>

      {/* Technician Directory Cards with Checkboxes */}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {filteredProfiles.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-3 bg-surface-soft rounded-xl border border-dashed border-line">
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
 ? 'bg-info-soft border-transparent shadow-2xs'
 : 'bg-surface border-line hover:border-line-strong '
 }`}
              >
                {/* Left: Avatar + Details */}
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
 isSenior 
 ? 'bg-info-soft text-info border border-transparent '
 : 'bg-surface-soft text-ink-2 border border-line'
 }`}>
                    {isSenior ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-ink">
                        {tech.full_name}
                      </span>

                      {/* Rank Badge */}
                      <span className={`px-1.5 py-0.2 rounded text-micro font-semibold ${
 isSenior 
 ? 'bg-info-soft text-info border border-transparent '
 : 'bg-surface-soft text-ink-2'
 }`}>
                        {isSenior ? 'Senior Technician' : 'Technician'}
                      </span>

                      {/* Driver Badge */}
                      {tech.is_driver && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-micro font-semibold bg-warning-soft text-warning border border-transparent">
                          <Car className="w-2.5 h-2.5" />
                          <span>Driver</span>
                        </span>
                      )}

                      {/* Team Lead Pill */}
                      {isLead && (
                        <span className="px-1.5 py-0.2 rounded text-micro font-semibold bg-success text-white shadow-2xs">
                          ★ Team Lead
                        </span>
                      )}
                    </div>

                    {/* Conflict & Availability Status */}
                    <div className="flex items-center gap-1 text-micro">
                      {hasConflict ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
                          <span className="text-warning font-medium">
                            {conflictInfo?.reason}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                          <span className="text-success font-medium">
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
 ? 'bg-success border-success text-white'
 : 'border-line hover:border-line-strong'
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
        <div className="pt-3 border-t border-line space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center justify-between">
            <span>Team lead</span>
            {leadTechId && (
              <span className="text-micro font-semibold text-success">
                Designated Lead
              </span>
            )}
          </label>

          {selectedProfiles.length === 0 ? (
            <div className="p-3 text-center text-xs text-ink-3 bg-surface-soft rounded-xl border border-line">
              Select at least one technician above to assign a team lead.
            </div>
          ) : (
            <div className="relative">
              <select
                value={leadTechId}
                onChange={(e) => onSelectLead(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-semibold rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus shadow-2xs appearance-none cursor-pointer"
              >
                <option value="">-- Choose lead from selected crew --</option>
                {selectedProfiles.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name} — {tech.technician_level === 'senior' ? 'Senior Technician' : 'Technician'}{tech.is_driver ? ' (Driver)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            </div>
          )}

          <p className="text-micro text-ink-3">
            Choose the lead explicitly from the selected crew, rather than requiring the coordinator to choose from recommended cards first.
          </p>
        </div>
      )}
    </div>
  )
}
