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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Needs a Team</span>
        </span>
      )
    }
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>In Progress</span>
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Completed</span>
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8D9A] border border-black/[0.08] dark:border-white/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8E8D9A]" />
            <span>Cancelled</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Scheduled</span>
          </span>
        )
    }
  }

  const getAssignmentTypeBadge = (type?: string) => {
    if (type === 'deployment') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
          <PlaneTakeoff className="w-2.5 h-2.5" />
          <span>Out-of-Town</span>
        </span>
      )
    }
    if (type === 'office_duty') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <Building2 className="w-2.5 h-2.5" />
          <span>Office Duty</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
        <Wrench className="w-2.5 h-2.5" />
        <span>On-site</span>
      </span>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#F5F4F7] dark:bg-[#1E1F27] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
      {/* Table Scroll Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#EBEAEF] dark:bg-[#262732] border-b border-black/[0.08] dark:border-white/[0.08] text-[11px] font-bold text-[#575762] dark:text-[#B0B2BD] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 min-w-[260px]">Work Order & Assignment</th>
              <th className="py-3 px-4 min-w-[200px]">Lead & Crew</th>
              <th className="py-3 px-4 min-w-[180px]">Schedule & Mode</th>
              <th className="py-3 px-4 min-w-[130px]">Status</th>
              <th className="py-3 px-4 text-right min-w-[170px]">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-[#8E8D9A]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4D55CC] animate-ping" />
                    <span className="text-xs font-semibold">Loading operations schedule...</span>
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-[#8E8D9A]">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#8E8D9A]">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-[#121215] dark:text-[#F4F4F6] text-sm">No assignments found</span>
                    <span className="text-xs leading-relaxed text-[#8E8D9A] dark:text-[#7A7C88]">
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
                    className={`transition-colors border-b border-black/[0.06] dark:border-white/[0.06] ${
                      isCancelled 
                        ? 'opacity-60 bg-black/[0.01] dark:bg-white/[0.01]' 
                        : isUnassigned
                        ? 'bg-rose-500/[0.04] dark:bg-rose-950/[0.08]'
                        : 'hover:bg-black/[0.025] dark:hover:bg-white/[0.025]'
                    }`}
                  >
                    {/* Column 1: Work Order & Assignment */}
                    <td className="py-3 px-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getAssignmentTypeBadge(s.assignment_type)}
                          <p className={`font-bold text-xs truncate ${isCancelled ? 'line-through text-[#8E8D9A]' : 'text-[#121215] dark:text-[#F4F4F6]'}`}>
                            {s.project_name || s.client_name}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-[#8E8D9A] dark:text-[#7A7C88] truncate">
                          <MapPin className="w-3 h-3 text-[#8E8D9A] shrink-0" />
                          <span className="truncate">{s.location || 'Pacita HQ'}</span>
                        </div>

                        {s.cancellation_reason && (
                          <p className="text-[10px] text-rose-500 font-medium truncate">
                            Cancelled: {s.cancellation_reason}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Lead & Crew */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 text-[10px] font-extrabold ${
                          isUnassigned 
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400'
                            : s.profiles?.technician_level === 'senior'
                            ? 'bg-[#4D55CC]/15 border-[#4D55CC]/30 text-[#4D55CC] dark:text-[#7A82E6]'
                            : 'bg-[#EBEAEF] dark:bg-[#343640] border-black/[0.08] dark:border-white/[0.1] text-[#121215] dark:text-[#F4F4F6]'
                        }`}>
                          {isUnassigned ? <User className="w-3.5 h-3.5" /> : initials}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isUnassigned ? (
                              <button
                                type="button"
                                onClick={() => onAssignNow(s)}
                                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Unassigned</span>
                                <span className="text-[10px] bg-rose-500/15 dark:bg-rose-900/60 px-1.5 py-0.2 rounded-full font-bold">Assign</span>
                              </button>
                            ) : (
                              <span className="font-bold text-[#121215] dark:text-[#F4F4F6] truncate text-xs">
                                {s.profiles?.full_name || 'Staff'}
                              </span>
                            )}

                            {s.profiles?.technician_level === 'senior' && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#4D55CC]/15 text-[#4D55CC] dark:text-[#7A82E6]">
                                SENIOR
                              </span>
                            )}
                          </div>

                          {/* Crew Badges */}
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#8E8D9A]">
                            {activeCrewCount > 1 && (
                              <span className="inline-flex items-center gap-1 text-[#4D55CC] dark:text-indigo-400 font-bold">
                                <Users className="w-2.5 h-2.5" />
                                {activeCrewCount} in Crew
                              </span>
                            )}
                            {casualCount > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                +{casualCount} Helper{casualCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {activeCrewCount <= 1 && casualCount === 0 && !isUnassigned && (
                              <span className="text-[#8E8D9A] dark:text-[#7A7C88] text-[10px]">Solo assignment</span>
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
                            <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                              <CalendarIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              <span>From {formatDate(s.start_time)}</span>
                            </div>
                            <div className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] mt-0.5">
                              {s.target_review_date ? `Review: ${formatDate(s.target_review_date)}` : 'Active Project'}
                            </div>
                          </>
                        ) : isOfficeDuty ? (
                          <>
                            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                              <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                            </div>
                            <div className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] mt-0.5">
                              {formatDate(s.start_time)} &bull; Pacita HQ Duty
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 font-bold text-[#121215] dark:text-[#F4F4F6]">
                              <Clock className="w-3.5 h-3.5 text-[#8E8D9A] shrink-0" />
                              <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] mt-0.5">
                              <span>{formatDate(s.start_time)}</span>
                              <span>&bull;</span>
                              <span className="uppercase font-bold text-[9px] text-[#575762] dark:text-[#B0B2BD]">
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
                          className="px-3 py-1 text-xs font-bold bg-[#FAF9FB] dark:bg-[#2B2C35] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#121215] dark:text-[#F4F4F6] rounded-xl border border-black/[0.08] dark:border-white/[0.08] transition-colors cursor-pointer shadow-xs"
                        >
                          View
                        </button>

                        {!isCancelled && (
                          <>
                            <button
                              type="button"
                              onClick={() => onQuickReschedule(s)}
                              className="px-2.5 py-1 text-xs font-bold text-[#4D55CC] hover:bg-[#4D55CC]/10 dark:text-[#7A82E6] rounded-xl transition-colors cursor-pointer"
                            >
                              Reschedule
                            </button>

                            <button
                              type="button"
                              onClick={() => onCancel(s)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 rounded-xl transition-colors cursor-pointer"
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
        <div className="border-t border-black/[0.08] dark:border-white/[0.08] bg-[#FAF9FB]/60 dark:bg-[#1E1F27]/60 p-2.5">
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
