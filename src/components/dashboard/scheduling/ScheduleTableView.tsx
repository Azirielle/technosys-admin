'use client'

import React from 'react'
import Pagination from '@/components/ui/Pagination'
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, Users, Edit3, 
  Wrench, PlaneTakeoff, Building2, AlertTriangle, CheckCircle2, ChevronRight
} from 'lucide-react'
import { ScheduleItem, HorizonGranularity } from './types'

interface ScheduleTableViewProps {
  schedules: ScheduleItem[]
  loading: boolean
  currentPage: number
  itemsPerPage: number
  onPageChange: (p: number) => void
  onQuickReschedule: (s: ScheduleItem) => void
  onReassign: (s: ScheduleItem) => void
  onEdit: (s: ScheduleItem) => void
  onCancel: (s: ScheduleItem) => void
  onAssignNow: (s: ScheduleItem) => void
  granularity?: HorizonGranularity
  upcomingCount?: number
  onSwitchToUpcoming?: () => void
}

export default function ScheduleTableView({
  schedules,
  loading,
  currentPage,
  itemsPerPage,
  onPageChange,
  onQuickReschedule,
  onReassign,
  onEdit,
  onCancel,
  onAssignNow,
  granularity,
  upcomingCount = 0,
  onSwitchToUpcoming
}: ScheduleTableViewProps) {
  const totalPages = Math.ceil(schedules.length / itemsPerPage)
  const paginated = schedules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--'
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return isoString
    }
  }

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const getStatusBadge = (status?: string, isUnassigned?: boolean) => {
    if (isUnassigned) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-semibold bg-danger/15 text-danger border border-transparent animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
          <span>Needs a Team</span>
        </span>
      )
    }
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-semibold bg-warning/15 text-warning border border-transparent">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            <span>In Progress</span>
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-semibold bg-success/15 text-success border border-transparent">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span>Completed</span>
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-semibold bg-surface-soft text-ink-3 border border-line">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-3" />
            <span>Cancelled</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-semibold bg-info/15 text-ink border border-transparent">
            <span className="w-1.5 h-1.5 rounded-full bg-info" />
            <span>Scheduled</span>
          </span>
        )
    }
  }

  const getAssignmentTypeBadge = (type?: string) => {
    if (type === 'deployment') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold bg-info/10 text-info border border-transparent">
          <PlaneTakeoff className="w-2.5 h-2.5" />
          <span>Out-of-Town</span>
        </span>
      )
    }
    if (type === 'office_duty') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold bg-success/10 text-success border border-transparent">
          <Building2 className="w-2.5 h-2.5" />
          <span>Office Duty</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold bg-info/10 text-ink border border-transparent">
        <Wrench className="w-2.5 h-2.5" />
        <span>On-site</span>
      </span>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-surface-soft rounded-card border border-line shadow-xs">
      {/* Table Scroll Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-soft border-b border-line text-micro font-semibold text-ink-2 ">
            <tr>
              <th className="py-3 px-4 min-w-[260px]">Job</th>
              <th className="py-3 px-4 min-w-[200px]">Lead & Crew</th>
              <th className="py-3 px-4 min-w-[180px]">Schedule & Mode</th>
              <th className="py-3 px-4 min-w-[130px]">Status</th>
              <th className="py-3 px-4 text-right min-w-[170px]">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-ink-3">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-action animate-ping" />
                    <span className="text-xs font-semibold">Loading operations schedule...</span>
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-ink-3">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-card bg-surface-soft border border-line flex items-center justify-center text-ink-3">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-ink text-sm">No jobs here</span>
                    <span className="text-xs leading-relaxed text-ink-3">
                      No records match your selected date, type, or search query. Adjust your filters or create a new assignment.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((s) => {
                const isUnassigned = !s.technician_id || s.status === 'unassigned'
                const isCancelled = s.status === 'cancelled'
                const isDeployment = s.assignment_type === 'deployment'
                const isOfficeDuty = s.assignment_type === 'office_duty'

                // Count active crew
                const activeCrewCount = s.schedule_crew_assignments?.filter(c => c.status === 'active')?.length || 0
                const casualCount = s.schedule_casual_helpers?.length || 0

                const initials = s.profiles?.full_name
                  ? s.profiles.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                  : 'OP'

                return (
                  <tr 
                    key={s.id} 
                    className={`transition-colors border-b border-line ${
 isCancelled 
 ? 'opacity-60 bg-surface-soft ' 
 : isUnassigned
 ? 'bg-danger/[0.04] '
 : 'hover:bg-surface-hover '
 }`}
                  >
                    {/* Column 1: Work Order & Assignment */}
                    <td className="py-3 px-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getAssignmentTypeBadge(s.assignment_type)}
                          <p className={`font-semibold text-xs truncate ${isCancelled ? 'line-through text-ink-3' : 'text-ink'}`}>
                            {s.project_name || s.client_name}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-micro text-ink-3 truncate">
                          <MapPin className="w-3 h-3 text-ink-3 shrink-0" />
                          <span className="truncate">{s.location || 'Pacita HQ'}</span>
                        </div>

                        {s.cancellation_reason && (
                          <p className="text-micro text-danger font-medium truncate">
                            Cancelled: {s.cancellation_reason}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Lead & Crew */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 text-micro font-semibold ${
 isUnassigned 
 ? 'bg-danger/15 border-transparent text-danger'
 : s.profiles?.technician_level === 'senior'
 ? 'bg-action border-ink text-on-action'
 : 'bg-surface-soft border-line text-on-action'
 }`}>
                          {isUnassigned ? <User className="w-3.5 h-3.5" /> : initials}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isUnassigned ? (
                              <button
                                type="button"
                                onClick={() => onAssignNow(s)}
                                className="text-xs font-semibold text-danger hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>No lead yet</span>
                                <span className="text-micro bg-danger/15 px-1.5 py-0.2 rounded-full font-semibold">Assign</span>
                              </button>
                            ) : (
                              <span className="font-semibold text-ink truncate text-xs">
                                {s.profiles?.full_name || 'Staff'}
                              </span>
                            )}

                            {s.profiles?.technician_level === 'senior' && (
                              <span className="px-1.5 py-0.2 rounded-full text-micro font-semibold bg-action text-on-action">
                                SENIOR
                              </span>
                            )}
                          </div>

                          {/* Crew Badges */}
                          <div className="flex items-center gap-1.5 mt-0.5 text-micro text-ink-3">
                            {activeCrewCount > 1 && (
                              <span className="inline-flex items-center gap-1 text-ink font-semibold">
                                <Users className="w-2.5 h-2.5" />
                                {activeCrewCount} in Crew
                              </span>
                            )}
                            {casualCount > 0 && (
                              <span className="text-warning font-semibold">
                                +{casualCount} Helper{casualCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {activeCrewCount <= 1 && casualCount === 0 && !isUnassigned && (
                              <span className="text-ink-3 text-micro">Solo assignment</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Schedule & Mode */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col text-xs">
                        {isDeployment ? (
                          <>
                            <div className="flex items-center gap-1.5 font-semibold text-info ">
                              <CalendarIcon className="w-3.5 h-3.5 text-info shrink-0" />
                              <span>From {formatDate(s.start_time)}</span>
                            </div>
                            <div className="text-micro text-ink-3 mt-0.5">
                              {s.target_review_date ? `Review: ${formatDate(s.target_review_date)}` : 'Active Project'}
                            </div>
                          </>
                        ) : isOfficeDuty ? (
                          <>
                            <div className="flex items-center gap-1.5 font-semibold text-success">
                              <Clock className="w-3.5 h-3.5 text-success shrink-0" />
                              <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                            </div>
                            <div className="text-micro text-ink-3 mt-0.5">
                              {formatDate(s.start_time)} &bull; Pacita HQ Duty
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 font-semibold text-ink">
                              <Clock className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                              <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-micro text-ink-3 mt-0.5">
                              <span>{formatDate(s.start_time)}</span>
                              <span>&bull;</span>
                              <span className=" font-semibold text-micro text-ink-2">
                                {s.reporting_instruction === 'via_pacita_hq' ? 'Report via HQ' : 'Direct Site'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Column 4: Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(s.status, isUnassigned)}
                    </td>

                    {/* Column 5: Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(s)}
                          className="px-3 py-1 text-xs font-semibold bg-surface hover:bg-surface-soft text-ink rounded-xl border border-line transition-colors cursor-pointer shadow-xs"
                        >
                          View
                        </button>

                        {!isCancelled && (
                          <>
                            <button
                              type="button"
                              onClick={() => onQuickReschedule(s)}
                              className="px-2.5 py-1 text-xs font-semibold text-ink hover:bg-action rounded-xl transition-colors cursor-pointer"
                            >
                              Reschedule
                            </button>

                            <button
                              type="button"
                              onClick={() => onCancel(s)}
                              className="px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10 rounded-xl transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer clamped to 8 rows max */}
      {totalPages > 1 && (
        <div className="border-t border-line bg-surface p-2.5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={schedules.length}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}
