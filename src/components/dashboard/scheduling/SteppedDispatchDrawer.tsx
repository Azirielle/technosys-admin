'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, MapPin, Calendar as CalendarIcon, Clock, Users, User, ShieldCheck, 
  AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, Search, Plus, Check, Award,
  Compass, SlidersHorizontal
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { ProfileItem, CasualHelperItem, ScheduleItem, formatLocalDate, formatDisplayDate } from './types'
import { createDispatchesWithCrew, createOnSiteServiceAction } from '@/app/actions/schedules'
import TeamSelectionDirectory from './TeamSelectionDirectory'

const GeofenceMap = dynamic(() => import('../GeofenceMap'), {
  ssr: false,
  loading: () => (
    <div className="h-44 w-full flex items-center justify-center bg-surface-soft text-ink-3 text-xs font-medium rounded-xl">
      Loading interactive map...
    </div>
  )
})

interface SteppedDispatchDrawerProps {
  isOpen: boolean
  onClose: () => void
  profiles: ProfileItem[]
  casualHelpers: CasualHelperItem[]
  existingSchedules?: ScheduleItem[]
  onOpenCasualRegisterModal: () => void
  preselectedTechId?: string
  initialSchedule?: any
  selectedDate?: Date
  onSuccess: (targetDate?: string) => void
}

export default function SteppedDispatchDrawer({
  isOpen,
  onClose,
  profiles,
  casualHelpers,
  existingSchedules = [],
  onOpenCasualRegisterModal,
  preselectedTechId,
  initialSchedule,
  selectedDate,
  onSuccess
}: SteppedDispatchDrawerProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Step 1: Job details
  const [clientName, setClientName] = useState('')
  const [location, setLocation] = useState('')
  const [geofenceRadius, setGeofenceRadius] = useState(500)
  const [geofenceLat, setGeofenceLat] = useState(14.3541)
  const [geofenceLon, setGeofenceLon] = useState(121.0665)
  const [showAdvancedLocation, setShowAdvancedLocation] = useState(false)
  const [addressResults, setAddressResults] = useState<any[]>([])

  // Step 2: Set time (Timezone-safe initialized to selected calendar date)
  const [date, setDate] = useState(() => formatLocalDate(selectedDate || new Date()))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [reportingLocation, setReportingLocation] = useState<'direct_dispatch' | 'hq'>('direct_dispatch')

  // Step 3: Choose team
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([])
  const [leadTechId, setLeadTechId] = useState<string>('')
  const [selectedCasualHelperIds, setSelectedCasualHelperIds] = useState<string[]>([])

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

  // Initialize from props
  useEffect(() => {
    if (preselectedTechId) {
      setLeadTechId(preselectedTechId)
      setSelectedTechIds(prev => prev.includes(preselectedTechId) ? prev : [preselectedTechId, ...prev])
    }
    if (selectedDate && !initialSchedule) {
      setDate(formatLocalDate(selectedDate))
    }
    if (initialSchedule) {
      if (initialSchedule.client_name) setClientName(initialSchedule.client_name)
      if (initialSchedule.location) setLocation(initialSchedule.location)
      if (initialSchedule.start_time) {
        try {
          const s = new Date(initialSchedule.start_time)
          setDate(formatLocalDate(s))
          setStartTime(s.toTimeString().slice(0, 5))
          if (initialSchedule.end_time) {
            const e = new Date(initialSchedule.end_time)
            setEndTime(e.toTimeString().slice(0, 5))
          }
        } catch (e) {}
      }
    }
  }, [preselectedTechId, initialSchedule, isOpen])

  if (!isOpen) return null

  // Geocode address search
  const handleAddressSearch = async (query: string) => {
    setLocation(query)
    if (query.length >= 2) {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        const results = await res.json()
        setAddressResults(Array.isArray(results) ? results : [])
      } catch (e) {
        console.error("Geocode search failed", e)
      }
    } else {
      setAddressResults([])
    }
  }

  const selectAddress = (result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    setLocation(result.display_name)
    setGeofenceLat(lat)
    setGeofenceLon(lon)
    setAddressResults([])
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!leadTechId) {
      setErrorMessage("Please select who will lead this job.")
      setCurrentStep(3)
      return
    }

    if (!clientName.trim()) {
      setErrorMessage("Job or customer name is required.")
      setCurrentStep(1)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await createOnSiteServiceAction({
        clientName: clientName.trim(),
        location: location.trim() || 'Pacita HQ',
        date,
        startTime,
        endTime,
        reportingInstruction: reportingLocation === 'hq' ? 'via_pacita_hq' : 'direct_to_site',
        geofenceLat,
        geofenceLon,
        geofenceRadius,
        leadTechnicianId: leadTechId,
        crewTechnicianIds: selectedTechIds.filter(id => id !== leadTechId),
        casualHelperIds: selectedCasualHelperIds
      })

      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        onSuccess(date)
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to schedule job")
    } finally {
      setIsSubmitting(false)
    }
  }

  const leadTech = profiles.find(p => p.id === leadTechId)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-scrim transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex p-3 pl-4 sm:pl-10">
        <div className="w-screen max-w-2xl lg:max-w-3xl bg-surface rounded-modal shadow-overlay overflow-hidden flex flex-col animate-smooth-slide-in">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-line bg-surface-soft flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-action text-on-action flex items-center justify-center shrink-0 shadow-md">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink tracking-tight">
                  Schedule a Service Job
                </h2>
                <p className="text-xs text-ink-2 mt-0.5">
                  Create the job, set the time, and choose the team.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Drawer"
              className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Navigation (1 Job details, 2 Set time, 3 Choose team, 4 Review) */}
          <div className="px-8 py-3.5 border-b border-line bg-surface ">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { num: 1, label: 'Job details' },
                { num: 2, label: 'Set time' },
                { num: 3, label: 'Choose team' },
                { num: 4, label: 'Review' }
              ].map(step => (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setCurrentStep(step.num as any)}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
 currentStep === step.num
 ? 'bg-action text-on-action shadow-sm ring-2 ring-focus'
 : currentStep > step.num
 ? 'bg-info-soft text-on-action '
 : 'bg-surface-soft text-ink-3'
 }`}>
                    {currentStep > step.num ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </div>
                  <span className={`text-micro font-semibold transition-colors ${
 currentStep === step.num
 ? 'text-ink '
 : 'text-ink-2 group-hover:text-ink-2 '
 }`}>
                    {step.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 bg-danger-soft border border-transparent rounded-xl text-xs text-danger flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-danger">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Step Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">

            {/* STEP 1: Job details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Where is the job?
                  </h3>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Enter the work order and the location where the technician needs to go.
                  </p>
                </div>

                {/* Job or Customer Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink block">
                    Job or customer name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Aircon cleaning, SM Southmall"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-surface-soft border border-line rounded-xl text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus font-medium"
                  />
                </div>

                {/* Work Location Input */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-ink block">
                    Work location *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink" />
                    <input
                      type="text"
                      required
                      placeholder="Search for an address or work site"
                      value={location}
                      onChange={(e) => handleAddressSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-surface-soft border border-line rounded-xl text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 ring-focus font-medium"
                    />
                  </div>

                  {/* Address Suggestions Dropdown */}
                  {addressResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-line rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-line ">
                      {addressResults.map((res: any, idx: number) => (
                        <div
                          key={`addr-opt-${res.place_id || idx}-${idx}`}
                          onClick={() => selectAddress(res)}
                          className="px-3.5 py-2.5 text-xs text-ink hover:bg-surface-soft cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-ink shrink-0" />
                            <span className="font-medium truncate">{res.display_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work-Site Check-In Area Card */}
                <div className="p-4 bg-surface-soft rounded-xl border border-line space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Compass className="w-4 h-4 text-ink shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-ink block">
                        Work-site check-in area (Optional Settings)
                      </span>
                      <p className="text-micro text-ink-2 mt-0.5">
                        This controls how close a technician must be to the work site to check in on mobile. (Company standard default: {geofenceRadius} meters).
                      </p>
                      <span className="text-xs font-semibold text-ink mt-1 block">
                        Standard radius applied automatically
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedLocation(!showAdvancedLocation)}
                      className="text-xs font-semibold text-ink-2 hover:text-ink flex items-center gap-1 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{showAdvancedLocation ? 'Hide settings' : 'Change radius'}</span>
                    </button>
                  </div>

                  {/* Advanced Settings: Slider + Map */}
                  {showAdvancedLocation && (
                    <div className="pt-3 border-t border-line space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium text-ink-2">
                          <span>Check-in perimeter</span>
                          <span className="tabular-nums font-semibold text-ink">{geofenceRadius}m</span>
                        </div>
                        <input
                          type="range"
                          min={100}
                          max={1000}
                          step={50}
                          value={geofenceRadius}
                          onChange={(e) => setGeofenceRadius(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-surface-soft rounded-lg appearance-none cursor-pointer accent-[var(--tc-action)]"
                        />
                      </div>

                      <div className="h-44 rounded-xl border border-line overflow-hidden relative">
                        <GeofenceMap
                          lat={geofenceLat}
                          lon={geofenceLon}
                          radius={geofenceRadius}
                          onPositionChange={([lat, lon]) => {
                            setGeofenceLat(lat)
                            setGeofenceLon(lon)
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Set time */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    When will the work happen?
                  </h3>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Set the date and working hours for this service job.
                  </p>
                </div>

                {/* Work Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink block">
                    Work date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-surface-soft border border-line rounded-xl text-ink font-medium focus:outline-none focus:ring-1 ring-focus"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mt-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Selected Date: {formatDisplayDate(date)}</span>
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink block">
                      Start time *
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-surface-soft border border-line rounded-xl text-ink font-medium focus:outline-none focus:ring-1 ring-focus"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink block">
                      Expected finish time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-surface-soft border border-line rounded-xl text-ink font-medium focus:outline-none focus:ring-1 ring-focus"
                    />
                  </div>
                </div>

                {/* Reporting Location Option */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-ink block">
                    Where should the technician report?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReportingLocation('direct_dispatch')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
 reportingLocation === 'direct_dispatch'
 ? 'border-ink bg-info-soft text-ink shadow-2xs'
 : 'border-line hover:bg-surface-soft'
 }`}
                    >
                      <span className="text-xs font-semibold block">Go directly to job site</span>
                      <span className="text-micro text-ink-2 mt-0.5 block leading-relaxed">
                        Technician travels straight to customer location and clocks in on site.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportingLocation('hq')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
 reportingLocation === 'hq'
 ? 'border-ink bg-info-soft/50 text-ink shadow-2xs'
 : 'border-line hover:bg-surface-soft'
 }`}
                    >
                      <span className="text-xs font-semibold block">Report to Pacita HQ first</span>
                      <span className="text-micro text-ink-2 mt-0.5 block leading-relaxed">
                        Technician meets at company headquarters before dispatch.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Choose team */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Choose Your Team
                  </h3>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Select the people for this assignment. Availability and scheduling conflicts remain visible while you choose.
                  </p>
                </div>

                {/* Searchable Checkbox Team Selection Directory */}
                <TeamSelectionDirectory
                  profiles={profiles}
                  selectedTechIds={selectedTechIds}
                  onToggleTech={handleToggleTech}
                  leadTechId={leadTechId}
                  onSelectLead={setLeadTechId}
                  targetDate={date}
                  startTime={startTime}
                  endTime={endTime}
                  existingSchedules={existingSchedules}
                  requireLead={true}
                  hideCasualHelpers={false}
                />

                {/* Temporary Workers Section */}
                <div className="space-y-2 pt-3 border-t border-line">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-ink block">
                        Temporary workers (₱610/day)
                      </span>
                      <span className="text-micro text-ink-2">
                        On-demand day-wage support for heavy equipment or cable pulling.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenCasualRegisterModal}
                      className="text-micro font-semibold text-ink hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Register worker</span>
                    </button>
                  </div>

                  <div className="space-y-1 border border-line rounded-xl p-2.5 max-h-32 overflow-y-auto">
                    {casualHelpers.length === 0 ? (
                      <div className="py-2 text-center text-ink-3 text-xs">
                        No temporary workers currently registered.
                      </div>
                    ) : (
                      casualHelpers.map(ch => {
                        const isChecked = selectedCasualHelperIds.includes(ch.id)
                        return (
                          <label
                            key={ch.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs ${
 isChecked ? 'bg-info-soft' : 'hover:bg-surface-soft'
 }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCasualHelperIds([...selectedCasualHelperIds, ch.id])
                                  } else {
                                    setSelectedCasualHelperIds(selectedCasualHelperIds.filter(id => id !== ch.id))
                                  }
                                }}
                                className="rounded border-line text-ink ring-focus cursor-pointer"
                              />
                              <span className="font-medium text-ink truncate">
                                {ch.full_name}
                              </span>
                            </div>
                            <span className="text-micro font-semibold text-success tabular-nums">
                              ₱{ch.daily_rate}/day
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Review assignment
                  </h3>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Double-check the service details before confirming the schedule.
                  </p>
                </div>

                {/* Summary Card */}
                <div className="p-4 bg-surface-soft border border-line rounded-card space-y-3.5">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-micro text-ink-3 block">Job / Customer</span>
                      <strong className="text-ink text-sm block mt-0.5">
                        {clientName || 'Not Set'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-micro text-ink-3 block">Work Location</span>
                      <span className="text-ink block truncate mt-0.5">
                        {location || 'Pacita HQ'}
                      </span>
                    </div>

                    <div>
                      <span className="text-micro text-ink-3 block">Schedule</span>
                      <span className="text-ink font-semibold block mt-0.5">
                        {date} ({startTime} – {endTime})
                      </span>
                    </div>

                    <div>
                      <span className="text-micro text-ink-3 block">Reporting Arrangement</span>
                      <span className="text-ink block mt-0.5">
                        {reportingLocation === 'hq' ? 'Report to Pacita HQ first' : 'Go directly to job site'} ({geofenceRadius}m radius)
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between">
                    <div>
                      <span className="text-micro text-ink-3 block">Lead Technician</span>
                      <strong className="text-ink block mt-0.5">
                        {leadTech?.full_name || 'NO LEAD SELECTED'}
                      </strong>
                    </div>

                    <div className="text-right">
                      <span className="text-micro text-ink-3 block">Assigned Crew</span>
                      <span className="text-xs font-semibold text-ink block mt-0.5">
                        {selectedTechIds.filter(id => id !== leadTechId).length} Additional + {selectedCasualHelperIds.length} Temporary
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validation Status */}
                {!leadTechId ? (
                  <div className="p-3.5 bg-danger-soft border border-transparent rounded-xl flex items-center gap-2.5 text-xs text-danger ">
                    <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                    <span>Please choose who will lead this job before confirming.</span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-success-soft border border-transparent rounded-xl flex items-center gap-2.5 text-xs text-success ">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span>Team hierarchy verified: Lead technician confirmed and ready for dispatch.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Navigation Buttons */}
          <div className="px-6 py-4 border-t border-line bg-surface-soft flex items-center justify-between">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((currentStep - 1) as any)}
                  className="px-3 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>
                    {currentStep === 2 ? 'Back to job details' : currentStep === 3 ? 'Back to set time' : 'Back to choose team'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-ink-2 hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <button
                  type="button"
                  disabled={currentStep === 3 && selectedTechIds.length === 0}
                  onClick={() => {
                    if (currentStep === 3 && selectedTechIds.length === 0) return;
                    setCurrentStep((currentStep + 1) as any);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-action hover:bg-action-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-action rounded-pill transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-900/20"
                >
                  <span>
                    {currentStep === 1 
                      ? 'Continue to date and time' 
                      : currentStep === 2 
                      ? 'Continue to choose team' 
                      : (selectedTechIds.length === 0 ? 'Select a technician to continue' : 'Continue to review')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || !leadTechId || !clientName.trim()}
                  onClick={handleSubmit}
                  className="px-5 py-2.5 text-xs font-semibold bg-action hover:bg-action-hover text-on-action rounded-pill transition-colors cursor-pointer shadow-md shadow-blue-900/30 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSubmitting ? "Scheduling..." : "Confirm & Schedule Job"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
