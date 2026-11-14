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
    <div className="h-44 w-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-xs font-medium rounded-xl">
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
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-2xl lg:max-w-3xl bg-white dark:bg-[#0B0F19] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Schedule a Service Job
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Create the job, set the time, and choose the team.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Drawer"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Navigation (1 Job details, 2 Set time, 3 Choose team, 4 Review) */}
          <div className="px-8 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0F19]">
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
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === step.num
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : currentStep > step.num
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {currentStep > step.num ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </div>
                  <span className={`text-[11px] font-semibold transition-colors ${
                    currentStep === step.num
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                  }`}>
                    {step.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-rose-900">
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
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Where is the job?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Enter the work order and the location where the technician needs to go.
                  </p>
                </div>

                {/* Job or Customer Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    Job or customer name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Printer repair — Main Office"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                {/* Work Location Input */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    Work location *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                    <input
                      type="text"
                      required
                      placeholder="Search for an address or work site"
                      value={location}
                      onChange={(e) => handleAddressSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-zinc-50/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  {/* Address Suggestions Dropdown */}
                  {addressResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-700/50">
                      {addressResults.map((res: any, idx: number) => (
                        <div
                          key={`addr-opt-${res.place_id || idx}-${idx}`}
                          onClick={() => selectAddress(res)}
                          className="px-3.5 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-medium truncate">{res.display_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work-Site Check-In Area Card */}
                <div className="p-4 bg-zinc-50/80 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        Work-site check-in area (Optional Settings)
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        This controls how close a technician must be to the work site to check in on mobile. (Company standard default: {geofenceRadius} meters).
                      </p>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1 block">
                        Standard radius applied automatically
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedLocation(!showAdvancedLocation)}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{showAdvancedLocation ? 'Hide settings' : 'Change radius'}</span>
                    </button>
                  </div>

                  {/* Advanced Settings: Slider + Map */}
                  {showAdvancedLocation && (
                    <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          <span>Check-in perimeter</span>
                          <span className="font-mono font-bold text-blue-600">{geofenceRadius}m</span>
                        </div>
                        <input
                          type="range"
                          min={100}
                          max={1000}
                          step={50}
                          value={geofenceRadius}
                          onChange={(e) => setGeofenceRadius(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="h-44 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden relative">
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
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    When will the work happen?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Set the date and working hours for this service job.
                  </p>
                </div>

                {/* Work Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    Work date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Selected Date: {formatDisplayDate(date)}</span>
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                      Start time *
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                      Expected finish time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-zinc-50/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Reporting Location Option */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    Where should the technician report?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReportingLocation('direct_dispatch')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        reportingLocation === 'direct_dispatch'
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="text-xs font-bold block">Go directly to job site</span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block leading-relaxed">
                        Technician travels straight to customer location and clocks in on site.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportingLocation('hq')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        reportingLocation === 'hq'
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="text-xs font-bold block">Report to Pacita HQ first</span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block leading-relaxed">
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
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Choose Your Team
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
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
                <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        Temporary workers (₱610/day)
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        On-demand day-wage support for heavy equipment or cable pulling.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenCasualRegisterModal}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Register worker</span>
                    </button>
                  </div>

                  <div className="space-y-1 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 max-h-32 overflow-y-auto">
                    {casualHelpers.length === 0 ? (
                      <div className="py-2 text-center text-zinc-400 text-xs">
                        No temporary workers currently registered.
                      </div>
                    ) : (
                      casualHelpers.map(ch => {
                        const isChecked = selectedCasualHelperIds.includes(ch.id)
                        return (
                          <label
                            key={ch.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs ${
                              isChecked ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
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
                                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                {ch.full_name}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
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
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Review assignment
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Double-check the service details before confirming the schedule.
                  </p>
                </div>

                {/* Summary Card */}
                <div className="p-4 bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl space-y-3.5">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Job / Customer</span>
                      <strong className="text-zinc-900 dark:text-zinc-100 text-sm block mt-0.5">
                        {clientName || 'Not Set'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Work Location</span>
                      <span className="text-zinc-900 dark:text-zinc-100 block truncate mt-0.5">
                        {location || 'Pacita HQ'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Schedule</span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-semibold block mt-0.5">
                        {date} ({startTime} – {endTime})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Reporting Arrangement</span>
                      <span className="text-zinc-900 dark:text-zinc-100 block mt-0.5">
                        {reportingLocation === 'hq' ? 'Report to Pacita HQ first' : 'Go directly to job site'} ({geofenceRadius}m radius)
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Lead Technician</span>
                      <strong className="text-zinc-900 dark:text-zinc-100 block mt-0.5">
                        {leadTech?.full_name || 'NO LEAD SELECTED'}
                      </strong>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Assigned Crew</span>
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mt-0.5">
                        {selectedTechIds.filter(id => id !== leadTechId).length} Additional + {selectedCasualHelperIds.length} Temporary
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validation Status */}
                {!leadTechId ? (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Please choose who will lead this job before confirming.</span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Team hierarchy verified: Lead technician confirmed and ready for dispatch.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Navigation Buttons */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 flex items-center justify-between">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((currentStep - 1) as any)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1"
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
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-900/20"
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
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-900/30 disabled:opacity-50 flex items-center gap-1.5"
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
