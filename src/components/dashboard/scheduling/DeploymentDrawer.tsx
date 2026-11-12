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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-xl bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
              <PlaneTakeoff className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                New Out-of-Town Project
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Multi-day remote service project where the crew remains at the project site
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Drawer"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex items-center justify-between">
          {[
            { num: 1, title: 'Project Details' },
            { num: 2, title: 'Choose Team' },
            { num: 3, title: 'Review & Commit' }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s.num
                  ? 'bg-purple-600 text-white'
                  : step > s.num
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
              }`}>
                {step > s.num ? '✓' : s.num}
              </span>
              <span className={`text-xs font-semibold ${
                step === s.num ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
              }`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Project Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Project name / Work order *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Aircon Installation & Commissioning"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Project location / Destination *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Batangas Industrial Park, Calaca, Batangas"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Project start date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
                    Starts: {formatDisplayDate(startDate)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                    <span>Target review date</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Checkpoint</span>
                  </label>
                  <input
                    type="date"
                    value={targetReviewDate}
                    onChange={(e) => setTargetReviewDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                  <div className="text-[11px] text-zinc-500 font-semibold mt-1">
                    Review on: {formatDisplayDate(targetReviewDate)}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-200/60 dark:border-purple-800/60">
                💡 <strong>Open-ended project lifecycle:</strong> You do not need to invent an exact finishing date. The project remains active until completed, and the review date serves as a checkpoint to evaluate progress without locking out technicians permanently.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Project operational notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Technicians will lodge at site dormitory; tooling van assigned."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Choose Team */}
          {step === 2 && (
            <div className="space-y-3">
              {selectedTechIds.length === 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                    Project Summary
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    Out-of-Town Project
                  </span>
                </div>

                <div className="space-y-1">
                  <strong className="text-zinc-900 dark:text-zinc-100 text-sm block">
                    {projectName}
                  </strong>
                  <p className="text-zinc-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{location}</span>
                  </p>
                  <p className="text-zinc-500 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Starts {formatDisplayDate(startDate)} (Review checkpoint: {formatDisplayDate(targetReviewDate)})</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-1">
                    Assigned Project Crew ({selectedTechIds.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProfiles.map(p => (
                      <span
                        key={p.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                          p.id === leadTechId
                            ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {p.id === leadTechId && <ShieldCheck className="w-3 h-3 text-purple-600" />}
                        {p.full_name} {p.id === leadTechId ? '(Lead)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Technicians will be marked as assigned to this project starting {formatDisplayDate(startDate)}. You can add or release technicians anytime without recreating the project.</span>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
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
              className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-900/20"
            >
              <span>{step === 2 && selectedTechIds.length === 0 ? 'Select a technician to continue' : 'Continue'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || selectedTechIds.length === 0}
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-900/20"
            >
              {isSubmitting ? 'Launching Project...' : '✓ Confirm & Launch Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
