'use client'

import React from 'react'
import { Clock, AlertTriangle, User, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { ScheduleItem, ProfileItem } from './types'

interface ScheduleTimelineViewProps {
  schedules: ScheduleItem[]
  technicians: ProfileItem[]
  selectedDate: string
  onQuickReschedule: (s: ScheduleItem) => void
  onEdit: (s: ScheduleItem) => void
  onDispatchSlot: (techId: string, hourStr: string) => void
}

export default function ScheduleTimelineView({
  schedules,
  technicians,
  selectedDate,
  onQuickReschedule,
  onEdit,
  onDispatchSlot
}: ScheduleTimelineViewProps) {
  // Hours from 07:00 to 19:00 (12 operational hours)
  const startHour = 7
  const endHour = 19
  const totalHours = endHour - startHour
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i)

  // Map technician IDs to their schedules on this date
  const techMap = new Map<string, ScheduleItem[]>()
  technicians.forEach(t => techMap.set(t.id, []))

  // Also catch unassigned or schedules with unknown tech
  const unassignedSchedules: ScheduleItem[] = []

  schedules.forEach(s => {
    if (!s.technician_id || s.status === 'unassigned') {
      unassignedSchedules.push(s)
    } else {
      const arr = techMap.get(s.technician_id) || []
      arr.push(s)
      techMap.set(s.technician_id, arr)
    }
  })

  // Helper to calculate position in percentage (0% = 07:00, 100% = 19:00)
  const calculateBlockStyles = (startTimeStr: string, endTimeStr?: string | null) => {
    try {
      const start = new Date(startTimeStr)
      const end = endTimeStr ? new Date(endTimeStr) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

      const startHoursDec = start.getHours() + start.getMinutes() / 60
      const endHoursDec = end.getHours() + end.getMinutes() / 60

      const clampedStart = Math.max(startHour, Math.min(endHour, startHoursDec))
      const clampedEnd = Math.max(startHour, Math.min(endHour, endHoursDec))

      const leftPercent = ((clampedStart - startHour) / totalHours) * 100
      const widthPercent = Math.max(2, ((clampedEnd - clampedStart) / totalHours) * 100)

      return { left: `${leftPercent}%`, width: `${widthPercent}%` }
    } catch {
      return { left: '0%', width: '15%' }
    }
  }

  // Detect internal overlaps for a tech's schedule list
  const hasOverlap = (sList: ScheduleItem[], currentItem: ScheduleItem) => {
    if (currentItem.status === 'cancelled') return false
    const cStart = new Date(currentItem.start_time).getTime()
    const cEnd = currentItem.end_time 
      ? new Date(currentItem.end_time).getTime() 
      : cStart + 2 * 3600000

    return sList.some(other => {
      if (other.id === currentItem.id || other.status === 'cancelled') return false
      const oStart = new Date(other.start_time).getTime()
      const oEnd = other.end_time ? new Date(other.end_time).getTime() : oStart + 2 * 3600000
      return cStart < oEnd && cEnd > oStart
    })
  }

  return (
    <div className="bg-surface-soft rounded-card border border-line overflow-hidden shadow-xs flex flex-col">
      {/* Header with Timeline Date */}
      <div className="px-4 py-3 bg-surface-soft border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-ink" />
          <span className="text-xs font-semibold text-ink tabular-nums">
            Day Gantt View: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-micro text-ink-2 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-action" /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" /> In Duty
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger" /> Conflict
          </span>
        </div>
      </div>

      {/* Timeline Grid Container */}
      <div className="overflow-x-auto min-w-full">
        <div className="min-w-[800px]">
          {/* Timeline Hour Scale */}
          <div className="flex border-b border-line bg-surface text-micro tabular-nums text-ink-3">
            <div className="w-56 shrink-0 p-2.5 border-r border-line font-sans font-semibold text-ink-2 text-micro ">
              Technician
            </div>
            <div className="flex-1 relative h-7">
              {hours.map((h, idx) => (
                <div
                  key={h}
                  className="absolute top-0 bottom-0 border-l border-line pl-1 pt-1"
                  style={{ left: `${(idx / totalHours) * 100}%` }}
                >
                  {h.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Unassigned Row if any */}
          {unassignedSchedules.length > 0 && (
            <div className="flex border-b border-transparent bg-danger/[0.05] ">
              <div className="w-56 shrink-0 p-2.5 border-r border-transparent flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                <span className="text-xs font-semibold text-danger">
                  Unassigned Queue ({unassignedSchedules.length})
                </span>
              </div>
              <div className="flex-1 relative h-12 p-1">
                {unassignedSchedules.map(s => {
                  const styles = calculateBlockStyles(s.start_time, s.end_time)
                  return (
                    <div
                      key={s.id}
                      onClick={() => onQuickReschedule(s)}
                      style={styles}
                      className="absolute top-2 h-8 rounded-lg bg-danger text-white text-micro font-semibold flex items-center px-2.5 truncate shadow-xs cursor-pointer hover:opacity-90 transition-colors"
                      title={`Unassigned: ${s.client_name} - Click to schedule`}
                    >
                      {s.client_name}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Technician Rows */}
          {technicians.map((tech) => {
            const techSchedules = techMap.get(tech.id) || []
            const isOnLeave = tech.lifecycle_status === 'on_leave'

            return (
              <div 
                key={tech.id} 
                className="flex border-b border-line hover:bg-surface-hover transition-colors"
              >
                {/* Tech Label Cell */}
                <div className="w-56 shrink-0 p-2.5 border-r border-line flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-surface-soft border border-line flex items-center justify-center text-micro font-semibold text-ink shrink-0">
                      {tech.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-ink truncate">
                        {tech.full_name}
                      </span>
                      <span className="text-micro text-ink-3 capitalize">
                        {tech.technician_level}
                      </span>
                    </div>
                  </div>

                  {isOnLeave && (
                    <span className="text-micro font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full border border-transparent">
                      ON LEAVE
                    </span>
                  )}
                </div>

                {/* Timeline Lane */}
                <div className="flex-1 relative h-12">
                  {/* Vertical hour guidelines */}
                  {hours.map((_, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 border-l border-line pointer-events-none"
                      style={{ left: `${(idx / totalHours) * 100}%` }}
                    />
                  ))}

                  {/* Dispatched Job Blocks */}
                  {techSchedules.map((s) => {
                    const styles = calculateBlockStyles(s.start_time, s.end_time)
                    const isOverlap = hasOverlap(techSchedules, s)
                    const isInDuty = s.status === 'in_progress'

                    return (
                      <div
                        key={s.id}
                        onClick={() => onQuickReschedule(s)}
                        style={styles}
                        className={`absolute top-1.5 h-9 rounded-pill px-2.5 py-0.5 border flex flex-col justify-center cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs z-10 ${
 isOverlap
 ? 'bg-danger/15 border-transparent text-danger ring-1 ring-danger'
 : isInDuty
 ? 'bg-success/15 border-transparent text-success '
 : 'bg-action border-ink text-on-action'
 }`}
                        title={`${s.client_name} (${s.location}) - Click to reschedule or view`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-micro font-semibold truncate">
                            {s.client_name}
                          </span>
                          {isOverlap && (
                            <span className="text-micro font-semibold bg-danger text-white px-1 rounded">
                              CONFLICT
                            </span>
                          )}
                        </div>
                        <span className="text-micro text-ink-3 truncate">
                          {s.location}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
