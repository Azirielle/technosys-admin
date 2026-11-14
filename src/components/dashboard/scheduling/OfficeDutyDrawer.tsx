'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, Building2, MapPin, Calendar as CalendarIcon, Clock, 
  Users, AlertTriangle, CheckCircle2, ShieldCheck, Check
} from 'lucide-react'
import { ProfileItem, ScheduleItem, formatLocalDate, formatDisplayDate } from './types'
import { createOfficeDutyAction } from '@/app/actions/schedules'
import TeamSelectionDirectory from './TeamSelectionDirectory'

interface OfficeDutyDrawerProps {
  isOpen: boolean
  onClose: () => void
  profiles: ProfileItem[]
  existingSchedules?: ScheduleItem[]
  selectedDate?: Date
  onSuccess: () => void
}

export default function OfficeDutyDrawer({
  isOpen,
  onClose,
  profiles,
  existingSchedules = [],
  selectedDate,
  onSuccess
}: OfficeDutyDrawerProps) {
  const [date, setDate] = useState(() => formatLocalDate(selectedDate || new Date()))
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [notes, setNotes] = useState('')
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (selectedDate) {
      setDate(formatLocalDate(selectedDate))
    }
  }, [selectedDate, isOpen])

  if (!isOpen) return null

  const handleToggleTech = (id: string) => {
    setSelectedTechIds(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (selectedTechIds.length === 0) {
      setErrorMessage('Please select at least one technician for Main Office Duty.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await createOfficeDutyAction({
        date,
        startTime,
        endTime,
        technicianIds: selectedTechIds,
        notes
      })

      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule office duty.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-scrim flex justify-end p-3">
      <div 
        className="w-full max-w-xl bg-surface rounded-modal shadow-overlay overflow-hidden flex flex-col h-full animate-smooth-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-success-soft text-success border border-transparent flex items-center justify-center">
              <Building2 className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Schedule Main Office Duty
              </h2>
              <p className="text-micro text-ink-2">
                Staff expected to report at Pacita HQ (Workshop / Standby / Inventory)
              </p>
            </div>
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-danger-soft border border-transparent text-xs text-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pacita HQ Auto-Lock Notice */}
          <div className="p-3.5 bg-success-soft border border-transparent rounded-xl space-y-1 text-xs">
            <div className="flex items-center gap-2 text-success font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              <span>Pacita HQ Geofence (San Pedro, Laguna)</span>
            </div>
            <p className="text-micro text-ink-2 leading-relaxed">
              No customer or client address needed. The system automatically verifies technicians inside the Pacita HQ 200-meter check-in area when clocking in from mobile.
            </p>
          </div>

          {/* Date & Shift Times */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Duty date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus tabular-nums"
              />
              <div className="text-micro text-success font-semibold mt-1">
                Duty Date: {formatDisplayDate(date)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Shift start time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Shift end time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Operational Duty Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Duty assignment notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Workshop tooling maintenance, inventory sorting, or stand-by team"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus"
            />
          </div>

          {/* Technician Selection Directory */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Select Technicians Expected at Pacita HQ *
              </label>
              <span className="text-micro tabular-nums text-ink-2">
                {selectedTechIds.length} selected
              </span>
            </div>

            <TeamSelectionDirectory
              profiles={profiles}
              selectedTechIds={selectedTechIds}
              onToggleTech={handleToggleTech}
              leadTechId=""
              onSelectLead={() => {}}
              targetDate={date}
              startTime={startTime}
              endTime={endTime}
              existingSchedules={existingSchedules}
              requireLead={false}
              hideCasualHelpers={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-surface-soft flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-ink-2 hover:text-ink transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || selectedTechIds.length === 0}
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold bg-action hover:bg-action-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-action rounded-pill transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isSubmitting 
                ? 'Assigning Duty...' 
                : (selectedTechIds.length === 0 ? 'Select staff to confirm' : `Confirm Office Duty (${selectedTechIds.length})`)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
