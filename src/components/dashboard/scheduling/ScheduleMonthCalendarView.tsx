'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Calendar as CalendarIcon, Clock, MapPin, Users, Wrench, 
  PlaneTakeoff, Building2, AlertCircle, 
  ArrowRight, Plus, Search, Filter, ShieldCheck, Check
} from 'lucide-react'
import { ScheduleItem, ProfileItem } from './types'

interface ScheduleMonthCalendarViewProps {
  currentDate: Date
  schedules: ScheduleItem[]
  technicians?: ProfileItem[]
  onSelectDate?: (d: Date) => void
  onQuickReschedule: (s: ScheduleItem) => void
  onEdit: (s: ScheduleItem) => void
  onSwitchToTimeline?: (d: Date) => void
  onDispatchTechnician?: (techId: string, d: Date) => void
  onNewAssignmentForDate?: (d: Date) => void
}

export default function ScheduleMonthCalendarView({
  currentDate,
  schedules,
  technicians = [],
  onSelectDate,
  onQuickReschedule,
  onEdit,
  onSwitchToTimeline,
  onDispatchTechnician,
  onNewAssignmentForDate
}: ScheduleMonthCalendarViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const [selectedDay, setSelectedDay] = useState<number>(() => {
    return Math.min(currentDate.getDate(), daysInMonth)
  })
  const [inspectorTab, setInspectorTab] = useState<'dispatches' | 'available_crew'>('dispatches')

  // Search & Filter state for Available Crew tab
  const [crewSearch, setCrewSearch] = useState('')
  const [crewRoleFilter, setCrewRoleFilter] = useState<'all' | 'senior' | 'driver' | 'helper'>('all')

  useEffect(() => {
    setSelectedDay(prev => Math.min(prev, daysInMonth))
  }, [currentDate, daysInMonth])

  // Monday = 0, Sunday = 6
  let startingDayIndex = firstDay.getDay() - 1
  if (startingDayIndex === -1) startingDayIndex = 6

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < startingDayIndex; i++) {
    calendarCells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d)
  }

  const activeTechnicians = technicians.filter(
    t => t.lifecycle_status !== 'archived' && t.lifecycle_status !== 'terminated'
  )

  const getDayMetrics = (day: number) => {
    const dayStart = new Date(year, month, day, 0, 0, 0, 0).getTime()
    const dayEnd = new Date(year, month, day, 23, 59, 59, 999).getTime()

    const daySchedules = schedules.filter(s => {
      if (s.status === 'cancelled') return false
      const sStart = new Date(s.start_time).getTime()
      
      if (s.assignment_type === 'deployment') {
        const sEnd = s.end_time 
          ? new Date(s.end_time).getTime() 
          : (s.target_review_date ? new Date(s.target_review_date).getTime() : sStart + 30 * 86400000)
        return sStart <= dayEnd && sEnd >= dayStart
      }

      const sEnd = s.end_time ? new Date(s.end_time).getTime() : sStart + 2 * 3600000
      return sStart <= dayEnd && sEnd >= dayStart
    })

    const bookedTechIds = new Set<string>()
    daySchedules.forEach(s => {
      if (s.technician_id) bookedTechIds.add(s.technician_id)
      if (s.schedule_crew_assignments) {
        s.schedule_crew_assignments.forEach(c => {
          if (c.status === 'active' && c.technician_id) {
            bookedTechIds.add(c.technician_id)
          }
        })
      }
    })

    const availableTechs = activeTechnicians.filter(t => 
      !bookedTechIds.has(t.id) && t.lifecycle_status !== 'on_leave'
    )

    const onLeaveTechs = activeTechnicians.filter(t => 
      t.lifecycle_status === 'on_leave'
    )

    const bookedTechs = activeTechnicians.filter(t => 
      bookedTechIds.has(t.id)
    )

    const deployments = daySchedules.filter(s => s.assignment_type === 'deployment')
    const onSites = daySchedules.filter(s => s.assignment_type === 'on_site' || !s.assignment_type)
    const officeDuties = daySchedules.filter(s => s.assignment_type === 'office_duty')

    return {
      daySchedules,
      deployments,
      onSites,
      officeDuties,
      availableTechs,
      onLeaveTechs,
      bookedTechs,
      totalTechs: activeTechnicians.length
    }
  }

  const selectedMetrics = getDayMetrics(selectedDay)
  const selectedDateObj = new Date(year, month, selectedDay)

  const isToday = (day: number) => {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Filtered available crew list based on search and role pill
  const filteredAvailableCrew = useMemo(() => {
    return selectedMetrics.availableTechs.filter(tech => {
      const matchesSearch = !crewSearch || 
        tech.full_name.toLowerCase().includes(crewSearch.toLowerCase())
      
      if (!matchesSearch) return false

      if (crewRoleFilter === 'senior') return tech.technician_level === 'senior'
      if (crewRoleFilter === 'driver') return tech.is_driver === true
      if (crewRoleFilter === 'helper') return tech.role === 'helper' || tech.technician_level === 'helper'
      return true
    })
  }, [selectedMetrics.availableTechs, crewSearch, crewRoleFilter])

  return (
    <div className="bg-surface-soft rounded-card border border-line shadow-xs overflow-hidden flex flex-col lg:flex-row min-h-[540px]">
      
      {/* LEFT: Work-First Month Calendar Matrix */}
      <div className="flex-1 p-4 border-b lg:border-b-0 lg:border-r border-line flex flex-col justify-between">
        <div>
          {/* Calendar Header Row */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-ink tabular-nums">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <span className="text-micro px-2.5 py-0.5 rounded-full bg-surface-soft text-ink-2 font-semibold border border-line">
                {activeTechnicians.length} Total Field Staff
              </span>
            </div>
            <span className="text-micro text-ink-3 hidden sm:inline">
              Click any date to inspect assignments
            </span>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1.5 text-center tabular-nums text-micro font-semibold text-ink-3 mb-1.5 ">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
              <div key={w} className="py-0.5">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Matrix */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return (
                  <div 
                    key={`empty-${idx}`} 
                    className="bg-surface-soft rounded-xl border border-transparent min-h-[74px]"
                  />
                )
              }

              const metrics = getDayMetrics(day)
              const isSelected = selectedDay === day
              const freeCount = metrics.availableTechs.length
              const hasWork = metrics.daySchedules.length > 0

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => {
                    setSelectedDay(day)
                    onSelectDate?.(new Date(year, month, day))
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[74px] ${
 isSelected
 ? 'border-ink bg-action ring-2 ring-focus shadow-xs'
 : 'border-line hover:border-ink hover:bg-surface-hover bg-surface shadow-xs'
 }`}
                >
                  {/* Cell Header: Date Number + Job Count */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs tabular-nums font-semibold ${
 isToday(day) 
 ? 'w-5 h-5 flex items-center justify-center rounded-full bg-action text-on-action text-micro' 
 : (isSelected ? 'text-on-action' : 'text-on-action')
 }`}>
                      {day}
                    </span>
                    {hasWork && (
                      <span className="text-micro tabular-nums px-2 py-0.2 rounded-full bg-surface-soft font-semibold text-ink">
                        {metrics.daySchedules.length} {metrics.daySchedules.length === 1 ? 'job' : 'jobs'}
                      </span>
                    )}
                  </div>

                  {/* Cell Body: WORK-FIRST EMPHASIS */}
                  <div className="flex flex-col gap-1 my-1">
                    {/* Out-of-Town Deployment Ribbon */}
                    {metrics.deployments.length > 0 && (
                      <span 
                        title={`Out-of-Town Project: ${metrics.deployments[0].project_name || metrics.deployments[0].client_name}`}
                        className="truncate px-1.5 py-0.5 rounded-lg text-micro font-semibold bg-info/10 text-info border border-transparent flex items-center gap-1"
                      >
                        <PlaneTakeoff className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{metrics.deployments[0].project_name || metrics.deployments[0].client_name}</span>
                      </span>
                    )}

                    {/* On-site Service Call Pill */}
                    {metrics.onSites.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        <span 
                          title={`${formatTime(metrics.onSites[0].start_time)} - ${metrics.onSites[0].client_name}`}
                          className="truncate px-1.5 py-0.5 rounded-lg text-micro font-semibold bg-surface text-ink border border-line flex items-center gap-1"
                        >
                          <Wrench className="w-2 h-2 text-ink shrink-0" />
                          <span className="truncate">{metrics.onSites[0].client_name}</span>
                        </span>

                        {metrics.onSites.length > 1 && (
                          <span className="text-micro font-semibold text-ink-3 pl-1">
                            +{metrics.onSites.length - 1} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Office Duty Pill */}
                    {metrics.officeDuties.length > 0 && (
                      <span 
                        title={`${metrics.officeDuties.length} Office Duty shift(s)`}
                        className="truncate px-1.5 py-0.5 rounded-lg text-micro font-semibold bg-success/10 text-success border border-transparent flex items-center gap-1"
                      >
                        <Building2 className="w-2 h-2 text-success shrink-0" />
                        <span>{metrics.officeDuties.length} Office</span>
                      </span>
                    )}
                  </div>

                  {/* Cell Footer: Quiet, Muted Availability Indicator */}
                  <div className="pt-0.5 flex items-center justify-between text-micro tabular-nums">
                    <span className="text-ink-3">
                      {freeCount} free
                    </span>

                    {freeCount === 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-danger/15 text-danger font-semibold">
                        Full
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Calm Bottom Legend */}
        <div className="pt-3 mt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 text-micro text-ink-2">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-action" />
              <span>Selected Date</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span>✈️ Out-of-Town</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span>🔧 On-site</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span>🏢 Main Office</span>
            </span>
          </div>
          <span className="text-micro tabular-nums text-ink-3">
            Selected: Day {selectedDay}
          </span>
        </div>
      </div>

      {/* RIGHT: Selected Day Inspector & Staffing Cockpit */}
      <div className="w-full lg:w-96 xl:w-[410px] bg-surface p-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-line">
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Day Header & Telemetry Subline */}
          <div className="pb-3 border-b border-line">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {selectedDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-micro tabular-nums text-ink-3 mt-0.5">
                  <span className="font-semibold text-ink">{selectedMetrics.bookedTechs.length}/{selectedMetrics.totalTechs}</span> booked &bull; <span className="font-semibold text-success">{selectedMetrics.availableTechs.length} Available</span>
                </p>
              </div>

              {isToday(selectedDay) && (
                <span className="px-2.5 py-0.5 rounded-full text-micro font-semibold bg-action text-on-action">
                  Today
                </span>
              )}
            </div>

            {/* Segmented Inspector Switcher: Dispatches vs. Available Crew */}
            <div className="grid grid-cols-2 gap-1 bg-surface-soft p-1 rounded-xl mt-3 text-xs font-semibold border border-line">
              <button
                type="button"
                onClick={() => setInspectorTab('dispatches')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
 inspectorTab === 'dispatches'
 ? 'bg-surface text-ink shadow-xs'
 : 'text-ink-2 hover:text-ink'
 }`}
              >
                <span>Jobs</span>
                <span className="px-1.5 py-0.2 rounded-full text-micro bg-surface-soft tabular-nums">
                  {selectedMetrics.daySchedules.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('available_crew')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
 inspectorTab === 'available_crew'
 ? 'bg-surface text-ink shadow-xs'
 : 'text-ink-2 hover:text-ink'
 }`}
              >
                <span>Free crew</span>
                <span className={`px-1.5 py-0.2 rounded-full text-micro tabular-nums ${
 selectedMetrics.availableTechs.length > 0 
 ? 'bg-success/15 text-success font-semibold' 
 : 'bg-surface-soft text-ink-3'
 }`}>
                  {selectedMetrics.availableTechs.length}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: Day Dispatches & Schedules */}
          {inspectorTab === 'dispatches' && (
            <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 max-h-[380px]">
              {selectedMetrics.daySchedules.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-3">
                  <div className="w-10 h-10 rounded-card bg-surface-soft border border-line flex items-center justify-center text-ink-3 mb-2">
                    <CalendarIcon className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <p className="text-xs font-semibold text-ink">
                    No dispatches scheduled on this date
                  </p>
                  <p className="text-micro text-ink-3 mt-0.5">
                    All {selectedMetrics.availableTechs.length} field technicians are free.
                  </p>
                </div>
              ) : (
                selectedMetrics.daySchedules.map(s => {
                  const type = s.assignment_type || 'on_site'
                  const leadTech = s.profiles?.full_name || 'Unassigned'
                  const crewCount = s.schedule_crew_assignments?.filter(c => c.status === 'active').length || 0
                  const isDriver = s.profiles?.is_driver

                  return (
                    <div
                      key={s.id}
                      className="bg-surface-soft rounded-xl p-3 border border-line shadow-xs space-y-2 transition-all hover:border-ink"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {type === 'deployment' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold bg-info/10 text-info border border-transparent">
                                <PlaneTakeoff className="w-2.5 h-2.5" /> Out-of-Town
                              </span>
                            ) : type === 'office_duty' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold bg-success/10 text-success border border-transparent">
                                <Building2 className="w-2.5 h-2.5" /> Office Duty
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold bg-info/10 text-ink border border-transparent">
                                <Wrench className="w-2.5 h-2.5" /> On-site
                              </span>
                            )}
                            <span className="text-micro tabular-nums text-ink-3 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(s.start_time)}
                              {s.end_time && ` – ${formatTime(s.end_time)}`}
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-ink truncate">
                            {type === 'deployment' ? (s.project_name || s.client_name) : s.client_name}
                          </h4>
                          
                          <p className="text-micro text-ink-3 truncate flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 shrink-0 text-ink-3" />
                            <span>{s.location}</span>
                          </p>
                        </div>
                      </div>

                      {/* Crew & Actions Footer */}
                      <div className="pt-2 border-t border-line flex items-center justify-between text-micro">
                        <div className="flex items-center gap-1.5 text-ink min-w-0 pr-2">
                          <Users className="w-3 h-3 text-ink-3 shrink-0" />
                          <span className="font-semibold truncate">{leadTech}</span>
                          {isDriver && (
                            <span title="Licensed Driver" className="text-micro">🚐</span>
                          )}
                          {crewCount > 0 && (
                            <span className="text-micro tabular-nums text-ink-3">+{crewCount}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEdit(s)}
                            className="px-2.5 py-1 text-micro font-semibold text-ink hover:bg-surface-soft rounded-lg transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickReschedule(s)}
                            className="px-2.5 py-1 text-micro font-semibold text-ink hover:bg-action rounded-lg transition-colors cursor-pointer"
                          >
                            Reschedule
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* TAB 2: Available Technicians Breakdown with Search & Role Filters */}
          {inspectorTab === 'available_crew' && (
            <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 max-h-[380px]">
              {/* Search & Role Filter Header */}
              <div className="space-y-2 pb-2 border-b border-line">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input
                    type="text"
                    placeholder="Search available crew..."
                    value={crewSearch}
                    onChange={(e) => setCrewSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-line bg-surface-soft text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 ring-focus"
                  />
                </div>

                {/* Role Filter Chips */}
                <div className="flex items-center gap-1 flex-wrap">
                  {(['all', 'senior', 'driver', 'helper'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setCrewRoleFilter(role)}
                      className={`px-2.5 py-0.5 rounded-full text-micro font-semibold capitalize transition-all cursor-pointer ${
 crewRoleFilter === role
 ? 'bg-action text-on-action shadow-xs'
 : 'bg-surface-soft text-ink-2 hover:text-ink'
 }`}
                    >
                      {role === 'driver' ? '🚐 Driver' : role === 'senior' ? 'Senior' : role}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAvailableCrew.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-center p-3">
                  <AlertCircle className="w-6 h-6 text-ink-3 mb-1" />
                  <p className="text-xs font-semibold text-ink">
                    No matching available technicians
                  </p>
                  <p className="text-micro text-ink-3 mt-0.5">
                    Try clearing search or role filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAvailableCrew.map(tech => {
                    const isSenior = tech.technician_level === 'senior'
                    const isDriver = tech.is_driver
                    const isHelper = tech.role === 'helper' || tech.technician_level === 'helper'

                    return (
                      <div
                        key={tech.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-surface-soft border border-line shadow-xs hover:border-ink transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-micro font-semibold shrink-0 border ${
 isSenior 
 ? 'bg-action border-ink text-on-action'
 : isDriver 
 ? 'bg-info/15 border-transparent text-on-action '
 : 'bg-surface-soft border-line text-on-action'
 }`}>
                            {tech.full_name.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-ink block truncate leading-tight">
                              {tech.full_name}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              {isSenior && (
                                <span className="text-micro font-semibold px-1.5 py-0.2 rounded-full bg-action text-on-action">
                                  Senior
                                </span>
                              )}
                              {isDriver && (
                                <span className="text-micro font-semibold px-1.5 py-0.2 rounded-full bg-info/15 text-ink ">
                                  🚐 Driver
                                </span>
                              )}
                              {isHelper && (
                                <span className="text-micro font-semibold px-1.5 py-0.2 rounded-full bg-surface-soft text-ink-2">
                                  Helper
                                </span>
                              )}
                              {!isSenior && !isHelper && (
                                <span className="text-micro font-semibold px-1.5 py-0.2 rounded-full bg-surface-soft text-ink-2">
                                  Tech
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {onDispatchTechnician && (
                          <button
                            type="button"
                            onClick={() => onDispatchTechnician(tech.id, selectedDateObj)}
                            className="px-2.5 py-1 text-micro font-semibold text-ink hover:bg-action rounded-lg border border-ink transition-colors cursor-pointer shrink-0"
                          >
                            + Dispatch
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM DEEP-LINK: Switch to Day Gantt Timeline */}
        {onSwitchToTimeline && (
          <div className="pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => onSwitchToTimeline(selectedDateObj)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-action hover:bg-action-hover text-on-action rounded-pill text-xs font-semibold transition-colors cursor-pointer shadow-xs group"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Inspect in Day Gantt Timeline</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
