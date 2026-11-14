'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, PlaneTakeoff, MapPin, Calendar as CalendarIcon, Clock, 
  Users, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck
} from 'lucide-react'
import { ProfileItem, ScheduleItem, formatLocalDate, formatDisplayDate } from './types'
import { createDeploymentAction } from '@/app/actions/schedules'
import TeamSelectionDirectory from './TeamSelectionDirectory'

interface DeploymentDrawerProps {
  isOpen: boolean
  onClose: () => void
  profiles: ProfileItem[]
  existingSchedules?: ScheduleItem[]
  selectedDate?: Date
  onSuccess: () => void
}

export default function DeploymentDrawer({
  isOpen,
  onClose,
  profiles,
  existingSchedules = [],
  selectedDate,
  onSuccess
}: DeploymentDrawerProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form State initialized to local selected date
  const [projectName, setProjectName] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState(() => formatLocalDate(selectedDate || new Date()))
  const [targetReviewDate, setTargetReviewDate] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date()
    d.setDate(d.getDate() + 30) // +30 days review default
    return formatLocalDate(d)
  })
  const [notes, setNotes] = useState('')

  // Team Selection State
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([])
  const [leadTechId, setLeadTechId] = useState<string>('')

  useEffect(() => {
    if (selectedDate) {
      setStartDate(formatLocalDate(selectedDate))
      const d = new Date(selectedDate)
      d.setDate(d.getDate() + 30)
      setTargetReviewDate(formatLocalDate(d))
    }
  }, [selectedDate, isOpen])

  if (!isOpen) return null

  const handleToggleTech = (id: string) => {
    setSelectedTechIds(prev => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter(t => t !== id) : [...prev, id]
      if (exists && leadTechId === id) {
        setLeadTechId(next[0] || '')
      } else if (!exists && !leadTechId) {
        setLeadTechId(id)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await createDeploymentAction({
        projectName,
        location,
        startDate,
        targetReviewDate,
        leadTechnicianId: leadTechId || selectedTechIds[0],
        crewTechnicianIds: selectedTechIds,
        notes
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create out-of-town project.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedProfiles = profiles.filter(p => selectedTechIds.includes(p.id))
  const leadProfile = profiles.find(p => p.id === leadTechId)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-scrim flex justify-end p-3">
      <div 
        className="w-full max-w-xl bg-surface rounded-modal shadow-overlay overflow-hidden flex flex-col h-full animate-smooth-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-info-soft text-info border border-transparent flex items-center justify-center">
              <PlaneTakeoff className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">
                New Out-of-Town Project
              </h2>
              <p className="text-micro text-ink-2">
                Multi-day remote service project where the crew remains at the project site
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

        {/* Step Indicator */}
        <div className="px-6 py-2.5 border-b border-line bg-surface flex items-center justify-between">
          {[
            { num: 1, title: 'Project Details' },
            { num: 2, title: 'Choose Team' },
            { num: 3, title: 'Review & Commit' }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-micro font-semibold ${
 step === s.num
 ? 'bg-action text-on-action'
 : step > s.num
 ? 'bg-success text-white'
 : 'bg-surface-soft text-ink-3'
 }`}>
                {step > s.num ? '✓' : s.num}
              </span>
              <span className={`text-xs font-semibold ${
 step === s.num ? 'text-ink' : 'text-ink-3'
 }`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-danger-soft border border-transparent text-xs text-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Project Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Project name / Work order *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Aircon Installation & Commissioning"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Project location / Destination *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Batangas Industrial Park, Calaca, Batangas"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">
                    Project start date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus tabular-nums"
                  />
                  <div className="text-micro text-info font-semibold mt-1">
                    Starts: {formatDisplayDate(startDate)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink flex items-center justify-between">
                    <span>Target review date</span>
                    <span className="text-micro text-info font-semibold">Checkpoint</span>
                  </label>
                  <input
                    type="date"
                    value={targetReviewDate}
                    onChange={(e) => setTargetReviewDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-control border border-transparent bg-surface-soft hover:border-line-strong focus:bg-surface text-ink focus:outline-none focus:ring-1 ring-focus tabular-nums"
                  />
                  <div className="text-micro text-ink-2 font-semibold mt-1">
                    Review on: {formatDisplayDate(targetReviewDate)}
                  </div>
                </div>
              </div>

              <p className="text-micro text-ink-2 leading-relaxed bg-info-soft/50 p-3 rounded-xl border border-transparent ">
                💡 <strong>Open-ended project lifecycle:</strong> You do not need to invent an exact finishing date. The project remains active until completed, and the review date serves as a checkpoint to evaluate progress without locking out technicians permanently.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Project operational notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Technicians will lodge at site dormitory; tooling van assigned."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Choose Team */}
          {step === 2 && (
            <div className="space-y-3">
              {selectedTechIds.length === 0 && (
                <div className="p-3 bg-warning-soft border border-transparent rounded-xl text-xs text-warning flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <span>Please select at least one technician for this project before continuing.</span>
                </div>
              )}
              <TeamSelectionDirectory
                profiles={profiles}
                selectedTechIds={selectedTechIds}
                onToggleTech={handleToggleTech}
                leadTechId={leadTechId}
                onSelectLead={setLeadTechId}
                targetDate={startDate}
                existingSchedules={existingSchedules}
                requireLead={true}
                hideCasualHelpers={true}
              />
            </div>
          )}

          {/* STEP 3: Review & Commit */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-soft border border-line space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="text-micro font-semibold text-info ">
                    Project Summary
                  </span>
                  <span className="px-2 py-0.5 rounded text-micro font-semibold bg-info-soft text-info ">
                    Out-of-Town Project
                  </span>
                </div>

                <div className="space-y-1">
                  <strong className="text-ink text-sm block">
                    {projectName}
                  </strong>
                  <p className="text-ink-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-ink-3" />
                    <span>{location}</span>
                  </p>
                  <p className="text-ink-2 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-ink-3" />
                    <span>Starts {formatDisplayDate(startDate)} (Review checkpoint: {formatDisplayDate(targetReviewDate)})</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-line">
                  <span className="text-ink-3 text-micro font-semibold block mb-1">
                    Assigned Project Crew ({selectedTechIds.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProfiles.map(p => (
                      <span
                        key={p.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
 p.id === leadTechId
 ? 'bg-info-soft text-info border border-transparent'
 : 'bg-surface-soft text-ink'
 }`}
                      >
                        {p.id === leadTechId && <ShieldCheck className="w-3 h-3 text-info" />}
                        {p.full_name} {p.id === leadTechId ? '(Lead)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-success-soft border border-transparent rounded-xl flex items-center gap-2.5 text-xs text-success ">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span>Technicians will be marked as assigned to this project starting {formatDisplayDate(startDate)}. You can add or release technicians anytime without recreating the project.</span>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-line bg-surface-soft flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-3.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-ink-2 hover:text-ink transition cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={(step === 1 && (!projectName.trim() || !location.trim())) || (step === 2 && selectedTechIds.length === 0)}
              onClick={() => {
                if (step === 2 && selectedTechIds.length === 0) {
                  setErrorMessage('Please select at least one technician for the project.')
                  return
                }
                setErrorMessage(null)
                setStep((step + 1) as any)
              }}
              className="px-4 py-2 text-xs font-semibold bg-action hover:bg-action-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-action rounded-pill transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-900/20"
            >
              <span>{step === 2 && selectedTechIds.length === 0 ? 'Select a technician to continue' : 'Continue'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || selectedTechIds.length === 0}
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold bg-action hover:bg-action-hover disabled:opacity-50 text-on-action rounded-pill transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-900/20"
            >
              {isSubmitting ? 'Launching Project...' : '✓ Confirm & Launch Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
