'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, Clock, Calendar as CalendarIcon, AlertTriangle, CheckCircle2, User, 
  MapPin, UserCheck, Ban, History, FileText, ArrowRight, ShieldAlert, Edit3, Compass
} from 'lucide-react'
import { ScheduleItem, ScheduleChangeLogItem, formatLocalDate, formatDisplayDate } from './types'
import { 
  rescheduleAssignmentAction, 
  getScheduleChangeLogs, 
  cancelAssignmentAction,
  updateAssignmentDetailsAction 
} from '@/app/actions/schedules'

interface QuickRescheduleDrawerProps {
  isOpen: boolean
  onClose: () => void
  schedule: ScheduleItem | null
  allSchedules: ScheduleItem[]
  initialTab?: 'reschedule' | 'edit_details' | 'history'
  onSuccess: (targetDate?: string) => void
  onReassign?: (s: ScheduleItem) => void
  onCancel?: (s: ScheduleItem) => void
}

export default function QuickRescheduleDrawer({
  isOpen,
  onClose,
  schedule,
  allSchedules,
  initialTab = 'reschedule',
  onSuccess,
  onReassign,
  onCancel
}: QuickRescheduleDrawerProps) {
  const [activeTab, setActiveTab] = useState<'reschedule' | 'edit_details' | 'history'>(initialTab)

  // Reschedule Tab State
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('17:00')
  const [rescheduleReason, setRescheduleReason] = useState('Client requested rescheduling')

  // Edit Details Tab State
  const [clientName, setClientName] = useState('')
  const [location, setLocation] = useState('')
  const [reportingInstruction, setReportingInstruction] = useState<'direct_to_site' | 'via_pacita_hq'>('direct_to_site')
  const [editDetailsReason, setEditDetailsReason] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Change History State
  const [changeLogs, setChangeLogs] = useState<ScheduleChangeLogItem[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Cancellation State
  const [showCancelPrompt, setShowCancelPrompt] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab, isOpen])

  useEffect(() => {
    if (schedule && schedule.start_time) {
      try {
        const s = new Date(schedule.start_time)
        setNewDate(formatLocalDate(s))
        setNewStartTime(s.toTimeString().slice(0, 5))

        if (schedule.end_time) {
          const e = new Date(schedule.end_time)
          setNewEndTime(e.toTimeString().slice(0, 5))
        } else {
          setNewEndTime('17:00')
        }
      } catch (err) {
        console.error("Error parsing schedule time", err)
      }

      setClientName(schedule.project_name || schedule.client_name || '')
      setLocation(schedule.location || '')
      setReportingInstruction(schedule.reporting_instruction || 'direct_to_site')
      setEditDetailsReason('')
      setRescheduleReason('Client requested rescheduling')
      setErrorMessage(null)
      setSuccessMessage(null)

      // Fetch logs for this schedule
      fetchLogs(schedule.id)
    }
  }, [schedule, isOpen])

  const fetchLogs = async (id: string) => {
    setLoadingLogs(true)
    try {
      const res = await getScheduleChangeLogs(id)
      if (res?.data) setChangeLogs(res.data as any[])
    } catch (err) {
      console.warn("Failed to load logs:", err)
    } finally {
      setLoadingLogs(false)
    }
  }

  if (!isOpen || !schedule) return null

  // Check for conflicts on proposed reschedule
  const checkOverlap = () => {
    if (!schedule.technician_id || !newDate || !newStartTime) return null

    const proposedStart = new Date(`${newDate}T${newStartTime}:00`).getTime()
    const proposedEnd = newEndTime 
      ? new Date(`${newDate}T${newEndTime}:00`).getTime() 
      : proposedStart + 2 * 3600000

    const conflict = allSchedules.find(other => {
      if (other.id === schedule.id || other.status === 'cancelled') return false
      if (other.technician_id !== schedule.technician_id) return false

      const oStart = new Date(other.start_time).getTime()
      const oEnd = other.end_time ? new Date(other.end_time).getTime() : oStart + 2 * 3600000
      return proposedStart < oEnd && proposedEnd > oStart
    })

    return conflict
  }

  const conflict = checkOverlap()

  // Save Reschedule
  const handleSaveReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rescheduleReason.trim()) {
      setErrorMessage("Please enter an operational reason for this reschedule (mandatory for audit).")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await rescheduleAssignmentAction({
        scheduleId: schedule.id,
        newDate,
        newStartTime,
        newEndTime,
        reason: rescheduleReason.trim()
      })

      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess(newDate)
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reschedule assignment")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Save Edit Details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) {
      setErrorMessage("Job / Client name is required.")
      return
    }
    if (!location.trim()) {
      setErrorMessage("Job location address is required.")
      return
    }
    if (!editDetailsReason.trim()) {
      setErrorMessage("Please state why this job detail is being modified (mandatory for audit trail).")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await updateAssignmentDetailsAction({
        scheduleId: schedule.id,
        clientName: clientName.trim(),
        location: location.trim(),
        reportingInstruction,
        reason: editDetailsReason.trim()
      })

      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage("Job details updated successfully.")
        fetchLogs(schedule.id)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 800)
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update details")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirm Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setErrorMessage("Please select or enter an operational reason before cancelling.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await cancelAssignmentAction({
        scheduleId: schedule.id,
        reason: cancelReason.trim()
      })
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel assignment")
    } finally {
      setIsSubmitting(false)
      setShowCancelPrompt(false)
    }
  }

  const isDeployment = schedule.assignment_type === 'deployment'
  const isOfficeDuty = schedule.assignment_type === 'office_duty'

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-scrim flex justify-end p-3">
      <div 
        className="w-full max-w-lg bg-surface rounded-modal shadow-overlay overflow-hidden flex flex-col h-full animate-smooth-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Manage Assignment
            </h2>
            <p className="text-micro text-ink-2">
              {schedule.project_name || schedule.client_name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Drawer"
            className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-surface-soft transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: 3 Explicit Tabs */}
        <div className="flex items-center border-b border-line bg-surface px-4 pt-1">
          <button
            type="button"
            onClick={() => { setActiveTab('reschedule'); setErrorMessage(null); }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
 activeTab === 'reschedule'
 ? 'border-ink text-ink '
 : 'border-transparent text-ink-2 hover:text-ink'
 }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Reschedule Time</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('edit_details'); setErrorMessage(null); }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
 activeTab === 'edit_details'
 ? 'border-ink text-ink '
 : 'border-transparent text-ink-2 hover:text-ink'
 }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('history'); setErrorMessage(null); }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
 activeTab === 'history'
 ? 'border-ink text-ink '
 : 'border-transparent text-ink-2 hover:text-ink'
 }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Change History ({changeLogs.length})</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-danger-soft border border-transparent text-xs text-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-success-soft border border-transparent text-xs text-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current Assignment Overview Card */}
          <div className="p-3.5 bg-surface-soft rounded-xl border border-line space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-micro font-semibold text-ink-3 ">
                Current State
              </span>
              <span className={`px-2 py-0.5 rounded text-micro font-semibold ${
 schedule.status === 'cancelled'
 ? 'bg-danger-soft text-danger border border-transparent'
 : 'bg-info-soft text-ink border border-transparent'
 }`}>
                {schedule.status?.toUpperCase() || 'SCHEDULED'}
              </span>
            </div>

            <div className="space-y-0.5">
              <p className="font-semibold text-ink text-sm">
                {schedule.project_name || schedule.client_name}
              </p>
              <p className="text-ink-2 flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                <span>{schedule.location || 'Pacita HQ'}</span>
              </p>
              <p className="text-ink-2 flex items-center gap-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                <span>Lead Technician: {schedule.profiles?.full_name || 'Unassigned'}</span>
              </p>
            </div>

            {/* Quick Reassign Shortcut */}
            <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
              <span className="text-ink-3 text-micro">Need to change crew?</span>
              <button
                type="button"
                onClick={() => {
                  if (onReassign) onReassign(schedule)
                }}
                className="text-xs font-semibold text-ink hover:text-ink flex items-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reassign Lead Tech</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Reschedule Date & Time */}
          {activeTab === 'reschedule' && (
            <form onSubmit={handleSaveReschedule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  New appointment date *
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus tabular-nums"
                />
                <div className="text-micro text-ink font-semibold mt-1">
                  Rescheduling to: {formatDisplayDate(newDate)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">
                    Start time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">
                    Finish time
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus tabular-nums"
                  />
                </div>
              </div>

              {/* Conflict Warning */}
              {conflict && (
                <div className="p-3 rounded-xl bg-warning-soft border border-transparent space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-warning ">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                    <span>Technician Schedule Collision</span>
                  </div>
                  <p className="text-micro text-warning">
                    {schedule.profiles?.full_name} is already assigned to "{conflict.client_name}" on this date during overlapping hours.
                  </p>
                </div>
              )}

              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Reschedule justification * (Audit Requirement)
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Customer requested afternoon visit due to building maintenance..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !rescheduleReason.trim()}
                  className="w-full py-2.5 text-xs font-semibold bg-action hover:bg-action-hover disabled:opacity-50 text-on-action rounded-pill transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Saving changes..." : "Save & Reschedule Appointment"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Edit Job Details */}
          {activeTab === 'edit_details' && (
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  {isDeployment ? 'Project Name / Work Order *' : 'Customer / Work Order Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Work Location / Address *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus"
                  />
                </div>
              </div>

              {/* Reporting Travel Instruction */}
              {!isOfficeDuty && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">
                    Reporting Travel Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
 reportingInstruction === 'direct_to_site'
 ? 'border-ink bg-info-soft text-ink font-semibold'
 : 'border-line text-ink-2'
 }`}>
                      <input
                        type="radio"
                        name="reporting_instr"
                        checked={reportingInstruction === 'direct_to_site'}
                        onChange={() => setReportingInstruction('direct_to_site')}
                        className="hidden"
                      />
                      <span>Direct to Site</span>
                    </label>

                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
 reportingInstruction === 'via_pacita_hq'
 ? 'border-ink bg-info-soft text-ink font-semibold'
 : 'border-line text-ink-2'
 }`}>
                      <input
                        type="radio"
                        name="reporting_instr"
                        checked={reportingInstruction === 'via_pacita_hq'}
                        onChange={() => setReportingInstruction('via_pacita_hq')}
                        className="hidden"
                      />
                      <span>Via Pacita HQ</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Modification Reason * (Audit Requirement)
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g., Client corrected building suite address / service changed from cleaning to repair"
                  value={editDetailsReason}
                  onChange={(e) => setEditDetailsReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !editDetailsReason.trim() || !clientName.trim()}
                  className="w-full py-2.5 text-xs font-semibold bg-action hover:bg-action-hover disabled:opacity-50 text-on-action rounded-pill transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Updating details..." : "Save Job Details"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Change History Audit Log */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-line">
                <span className="text-micro font-semibold text-ink-3">
                  Immutable Audit Trail
                </span>
                <span className="text-micro text-ink-3 tabular-nums">
                  {changeLogs.length} events logged
                </span>
              </div>

              {loadingLogs ? (
                <div className="py-8 text-center text-xs text-ink-3">
                  Loading change history...
                </div>
              ) : changeLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-3">
                  No previous changes recorded for this assignment.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {changeLogs.map(log => {
                    const d = new Date(log.created_at)
                    return (
                      <div
                        key={log.id}
                        className="p-3 bg-surface-soft rounded-xl border border-line space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-micro">
                          <span className="font-semibold text-ink capitalize">
                            {log.action_type.replace('_', ' ')}
                          </span>
                          <span className="text-ink-3 tabular-nums text-micro">
                            {d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-ink-2 text-xs font-medium">
                          {log.reason || 'Operational adjustment'}
                        </p>
                        {log.profiles?.full_name && (
                          <span className="text-micro text-ink-3 block mt-0.5">
                            Logged by: {log.profiles.full_name}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Cancellation Section */}
          {schedule.status !== 'cancelled' && (
            <div className="pt-4 border-t border-line">
              {!showCancelPrompt ? (
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="w-full py-2 text-xs font-semibold text-danger hover:text-danger hover:bg-danger-soft rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel This Assignment</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-danger-soft border border-transparent space-y-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-danger font-semibold">
                    <ShieldAlert className="w-4 h-4 text-danger" />
                    <span>Confirm Assignment Cancellation</span>
                  </div>
                  <p className="text-micro text-ink-2">
                    The assignment will be cancelled and assigned crew released. The complete history is permanently preserved.
                  </p>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-transparent bg-surface text-ink"
                  >
                    <option value="">-- Select cancellation reason --</option>
                    <option value="Customer requested cancellation">Customer requested cancellation</option>
                    <option value="Severe weather / flooding">Severe weather / flooding</option>
                    <option value="Job site inaccessible">Job site inaccessible</option>
                    <option value="Required materials unavailable">Required materials unavailable</option>
                    <option value="Technician emergency">Technician emergency</option>
                  </select>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-2.5 py-1 text-xs text-ink-2 hover:text-ink"
                    >
                      Keep Active
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !cancelReason}
                      onClick={handleConfirmCancel}
                      className="px-3.5 py-1 text-xs font-semibold bg-danger-solid hover:opacity-90 disabled:opacity-50 text-white rounded-pill transition"
                    >
                      {isSubmitting ? "Cancelling..." : "Confirm Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
