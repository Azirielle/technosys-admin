"use client"
import { useState, useTransition } from "react"
import { Calendar as CalendarIcon, Clock, MapPin, Star, UserPlus, X, Loader2, Users, User, Check, AlertCircle } from "lucide-react"
import { createSchedule, bulkCreateSchedules, toggleVipHook } from "@/app/actions/schedules"
import { useRouter } from "next/navigation"

const getLeaveRangeMs = (startDate: string, endDate: string) => {
  const start = startDate.includes('T') ? new Date(startDate).getTime() : new Date(`${startDate}T00:00:00.000Z`).getTime()
  const end = endDate.includes('T') ? new Date(endDate).getTime() : new Date(`${endDate}T23:59:59.999Z`).getTime()
  return { start, end }
}

export default function SchedulesClient({ 
  initialStaff, 
  initialSchedules,
  approvedLeaves
}: { 
  initialStaff: any[], 
  initialSchedules: any[],
  approvedLeaves: any[]
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Modal toggle state
  const [scheduleType, setScheduleType] = useState<'single' | 'bulk'>('single')
  
  // Single creation form states
  const [techId, setTechId] = useState("")
  const [seniorPartnerId, setSeniorPartnerId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [clientName, setClientName] = useState("")
  const [location, setLocation] = useState("")
  const [attendanceMode, setAttendanceMode] = useState("hq")
  const [isVip, setIsVip] = useState(false)
  
  // Bulk creation form states
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [bulkSeniorPartnerMap, setBulkSeniorPartnerMap] = useState<Record<string, string>>({})
  
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const techniciansOnly = initialStaff.filter(t => t.role === 'technician')

  const handleOpenModal = () => {
    setTechId(initialStaff[0]?.id || "")
    setSeniorPartnerId("")
    setStartTime("")
    setClientName("")
    setLocation("")
    setAttendanceMode("hq")
    setSeniorPartnerId("")
    setIsVip(false)
    setSelectedStaffIds([])
    setBulkSeniorPartnerMap({})
    setErrorMsg("")
    setSuccessMsg("")
    setShowModal(true)
  }

  const handleCreateSingle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg("")
    setSuccessMsg("")

    const selectedStaff = initialStaff.find(t => t.id === techId)
    const isHelper = selectedStaff?.role === 'helper'

    const formData = new FormData()
    formData.append("technicianId", techId)
    formData.append("clientName", clientName)
    formData.append("location", location)
    formData.append("startTime", startTime)
    formData.append("attendanceMode", attendanceMode)
    if (isHelper && seniorPartnerId) {
      formData.append("seniorPartnerId", seniorPartnerId)
    }
    if (isVip) {
      formData.append("isVip", "on")
    }
    
    startTransition(async () => {
      const res = await createSchedule(formData)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg("Schedule saved successfully!")
        setTimeout(() => {
          setShowModal(false)
          router.refresh()
        }, 1000)
      }
    })
  }

  const handleCreateBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setSuccessMsg("")

    if (selectedStaffIds.length === 0) {
      setErrorMsg("Please select at least one staff member to dispatch.")
      return
    }

    startTransition(async () => {
      const res = await bulkCreateSchedules({
        staffIds: selectedStaffIds,
        clientName,
        location,
        startTime,
        attendanceMode,
        seniorPartnerMap: bulkSeniorPartnerMap,
        isVip
      })

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        if (res.failureCount && res.failureCount > 0) {
          const failures = res.results?.filter(r => !r.success).map(r => `${r.name}: ${r.error}`).join(", ")
          setErrorMsg(`Partial Success: Scheduled ${res.successCount} staff. Failures: ${failures}`)
        } else {
          setSuccessMsg(`Successfully scheduled ${res.successCount} staff members!`)
          setTimeout(() => {
            setShowModal(false)
            router.refresh()
          }, 1000)
        }
      }
    })
  }

  const handleToggleVip = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await toggleVipHook(id, currentStatus)
      router.refresh()
    })
  }

  const getConflictingLeave = (technicianId: string) => {
    if (!startTime || !technicianId) return null
    const schedMs = new Date(startTime).getTime()
    return approvedLeaves.find(leave => {
      if (leave.technician_id !== technicianId) return false
      const { start: leaveStartMs, end: leaveEndMs } = getLeaveRangeMs(leave.start_date, leave.end_date)
      return schedMs >= leaveStartMs && schedMs <= leaveEndMs
    })
  }

  const currentConflict = scheduleType === 'single' ? getConflictingLeave(techId) : null
  const selectedStaffHasHelper = initialStaff.find(t => t.id === techId)?.role === 'helper'

  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Schedules & Dispatch</h1>
          <p className="text-zinc-500 mt-1">Manage technician itineraries, pair helper-tech teams, and set custom DTR modes.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
        >
          <CalendarIcon className="w-4 h-4" /> Dispatch Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Schedule List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-6">
              <CalendarIcon className="w-5 h-5 text-emerald-500" /> Active Itinerary
            </h2>
            
            <div className="space-y-4">
              {initialSchedules.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl text-zinc-500 italic">
                  No active dispatches. Click "Dispatch Assignment" to schedule staff.
                </div>
              ) : (
                initialSchedules.map(sched => (
                  <div 
                    key={sched.id} 
                    className={`p-5 rounded-xl border-l-4 relative overflow-hidden transition-all hover:shadow-md ${
                      !sched.technician
                        ? "border-l-amber-400 bg-amber-50/20 border-y border-r border-y-amber-100 border-r-amber-100"
                        : sched.is_vip_hook 
                        ? "border-l-cyan-500 bg-cyan-50/30 border-y border-r border-y-cyan-100 border-r-cyan-100" 
                        : "border-l-zinc-300 bg-white border-y border-r border-y-zinc-200 border-r-zinc-200"
                    }`}
                  >
                    {sched.is_vip_hook && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Star className="w-3 h-3 fill-white" /> VIP Hook Active
                      </div>
                    )}
                    
                    {!sched.technician && (
                      <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">Staff Unassigned — Needs Reassignment</p>
                          <p className="mt-0.5 text-xs text-amber-700">
                            The assigned employee was granted approved leave covering this dispatch period. Please reassign this job to another available staff member.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`font-bold text-lg ${sched.is_vip_hook ? "text-cyan-900 pr-32" : "text-zinc-800"}`}>
                          {sched.client_name}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                            sched.attendance_mode === 'hq' 
                              ? 'bg-zinc-50 border-zinc-200 text-zinc-600'
                              : sched.attendance_mode === 'direct_dispatch'
                              ? 'bg-blue-50 border-blue-100 text-blue-700'
                              : 'bg-amber-50 border-amber-100 text-amber-700'
                          }`}>
                            DTR Mode: {sched.attendance_mode === 'hq' ? 'Pacita HQ' : sched.attendance_mode === 'direct_dispatch' ? 'Direct Dispatch' : 'Out of Town'}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleToggleVip(sched.id, sched.is_vip_hook)}
                        disabled={isPending}
                        className={`text-xs font-bold px-3 py-1 rounded-full transition-colors border cursor-pointer ${
                          sched.is_vip_hook 
                            ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                            : "bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100"
                        }`}
                      >
                        {sched.is_vip_hook ? "Remove VIP" : "Make VIP"}
                      </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-xs text-zinc-500 my-4">
                      <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">
                        <Clock className="w-4 h-4 text-zinc-400" /> 
                        <span className="font-semibold text-zinc-700">
                          {new Date(sched.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {sched.end_time ? ` - ${new Date(sched.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : " (Continuous / Clock-out required)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">
                        <MapPin className="w-4 h-4 text-zinc-400" /> 
                        <span className="font-semibold text-zinc-700">{sched.location}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-zinc-100/80 px-3 py-1.5 rounded-md">
                        <span className="text-zinc-500 text-xs font-bold">DTR:</span>
                        <span className="font-semibold text-zinc-700 capitalize">
                          {sched.attendance_tracking_mode ? sched.attendance_tracking_mode.replace(/_/g, ' ') : 'Pacita HQ'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-zinc-150 flex flex-wrap items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-bold text-xs">
                          {sched.technician?.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-zinc-500">Assigned: </span>
                        <span className="font-bold text-zinc-700">{sched.technician?.full_name || 'Unknown'}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-extrabold tracking-wider ${
                          sched.technician?.role === 'helper' 
                            ? 'bg-teal-50 border-teal-100 text-teal-700' 
                            : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                        }`}>
                          {sched.technician?.role || 'Technician'}
                        </span>
                      </div>

                      {sched.senior_partner?.full_name && (
                        <div className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100/60 px-2.5 py-1 rounded-xl text-indigo-950">
                          <span className="font-bold text-[10px] uppercase">Partnered with:</span>
                          <span className="font-bold">{sched.senior_partner.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Side Panel for Staff List */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Field workforce</h2>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {initialStaff.length === 0 ? (
                <p className="text-sm text-zinc-500">No staff found. Register profiles in Employees page first.</p>
              ) : (
                initialStaff.map((tech) => (
                  <div key={tech.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center text-zinc-600 font-bold text-xs shadow-inner">
                        {tech.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 text-sm truncate">{tech.full_name}</p>
                        <p className="text-[10px] text-zinc-500 font-semibold">{tech.email}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-extrabold uppercase shrink-0 ${
                      tech.role === 'helper' 
                        ? 'bg-teal-50 border-teal-150 text-teal-700' 
                        : 'bg-indigo-50 border-indigo-150 text-indigo-700'
                    }`}>
                      {tech.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Modal (Dual Tab: Single / Bulk) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-end backdrop-blur-xs">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-zinc-150 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-950">Dispatch Assignment</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Deploy technicians or helper pairings to site itineraries.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>


            {/* Form Tabs */}
            <div className="flex border-b border-zinc-150 px-6">
              <button 
                type="button"
                onClick={() => {
                  setScheduleType('single')
                  setErrorMsg("")
                  setSuccessMsg("")
                }}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer ${
                  scheduleType === 'single' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-400 hover:text-zinc-800'
                }`}
              >
                <User className="w-4 h-4" /> Single Staff Dispatch
              </button>
              <button 
                type="button"
                onClick={() => {
                  setScheduleType('bulk')
                  setErrorMsg("")
                  setSuccessMsg("")
                }}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer ${
                  scheduleType === 'bulk' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-400 hover:text-zinc-800'
                }`}
              >
                <Users className="w-4 h-4" /> Bulk Team Dispatch
              </button>
            </div>

            {/* Scrollable Form Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50">
              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Dispatch Failed</p>
                    <p className="mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                  <Check className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Dispatch Scheduled</p>
                    <p className="mt-0.5">{successMsg}</p>
                  </div>
                </div>
              )}

              {/* SHARED GENERAL JOB DETAILS */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Itinerary & Location Details</h3>
                
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Client Name / Job Title</label>
                  <input 
                    required
                    type="text" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                    placeholder="e.g. Pacita Mall Aircon Cleaning" 
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Location / Site Address</label>
                  <input 
                    required
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                    placeholder="e.g. San Pedro, Laguna" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Start Time</label>
                    <input 
                      required
                      type="datetime-local" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Attendance Tracking Mode</label>
                    <select 
                      value={attendanceMode}
                      onChange={(e) => setAttendanceMode(e.target.value)}
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                      <option value="hq">HQ Biometric Standard (Pacita)</option>
                      <option value="direct_dispatch">On-Site Direct Dispatch (No Bio)</option>
                      <option value="out_of_town">Out-of-Town Mode (Continuous)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 bg-cyan-50/40 border border-cyan-150 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="isVip" 
                    checked={isVip}
                    onChange={(e) => setIsVip(e.target.checked)}
                    className="w-5 h-5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" 
                  />
                  <label htmlFor="isVip" className="text-xs font-bold text-cyan-900 cursor-pointer select-none">
                    Flag as VIP Hook (High Priority Dispatch)
                  </label>
                </div>
              </div>

              {/* SINGLE DISPATCH TAB */}
              {scheduleType === 'single' && (
                <form onSubmit={handleCreateSingle} className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Staff & Pairing Configuration</h3>
                  
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Deploy Employee</label>
                    <select 
                      required 
                      value={techId}
                      onChange={(e) => {
                        setTechId(e.target.value)
                        setSeniorPartnerId("")
                      }}
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {initialStaff.map(t => {
                        const hasConflict = approvedLeaves.some(leave => {
                          if (leave.technician_id !== t.id) return false
                          const { start, end } = getLeaveRangeMs(leave.start_date, leave.end_date)
                          const schedMs = new Date(startTime).getTime()
                          return schedMs >= start && schedMs <= end
                        })
                        return (
                          <option key={t.id} value={t.id}>
                            {t.full_name} ({t.role}){hasConflict ? " ⚠️ (On Leave)" : ""}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {selectedStaffHasHelper && (
                    <div className="animate-in fade-in slide-in-from-top duration-200">
                      <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Assign Senior Technician Partner</label>
                      <select 
                        value={seniorPartnerId}
                        onChange={(e) => setSeniorPartnerId(e.target.value)}
                        className="w-full px-3.5 py-2 border border-zinc-250 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">No Senior Partner (Independent Helper)</option>
                        {techniciansOnly.map(tech => (
                          <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {currentConflict && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-2xs font-semibold leading-normal flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>The selected worker is on approved leave during this time. Please adjust schedule or change worker.</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isPending || !!currentConflict || !clientName.trim() || !location.trim() || !startTime}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Dispatch Schedule"}
                  </button>
                </form>
              )}

              {/* BULK DISPATCH TAB */}
              {scheduleType === 'bulk' && (
                <form onSubmit={handleCreateBulk} className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Team Selection & Individual Pairings</h3>
                  
                  {!startTime && (
                    <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-700">
                      <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
                      <span>Select a <strong>Start Date &amp; Time</strong> above to see staff leave availability before selecting team members.</span>
                    </div>
                  )}

                  <div className="space-y-2 max-h-52 overflow-y-auto border border-zinc-200 rounded-xl p-3 bg-zinc-50/30 pr-1">
                    {initialStaff.map((t) => {
                      const isChecked = selectedStaffIds.includes(t.id)
                      const isHelper = t.role === 'helper'
                      const hasConflict = approvedLeaves.some(leave => {
                        if (leave.technician_id !== t.id) return false
                        const { start, end } = getLeaveRangeMs(leave.start_date, leave.end_date)
                        const schedMs = new Date(startTime).getTime()
                        return schedMs >= start && schedMs <= end
                      })

                      return (
                        <div key={t.id} className="space-y-2 border-b border-zinc-150 pb-2 last:border-0 last:pb-0">
                          <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors select-none ${
                            !startTime ? 'opacity-40 cursor-not-allowed' : hasConflict ? 'opacity-60 bg-amber-50/20 cursor-not-allowed' : 'hover:bg-zinc-50 cursor-pointer'
                          }`}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              disabled={!startTime || hasConflict}
                              onChange={() => toggleStaffSelection(t.id)}
                              className="w-4.5 h-4.5 rounded text-emerald-600 border-zinc-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1 flex items-center justify-between text-xs font-semibold text-zinc-700">
                              <span>{t.full_name} ({t.role}) {hasConflict ? "⚠️ (On Leave)" : ""}</span>
                            </div>
                          </label>

                          {isChecked && isHelper && (
                            <div className="ml-7 animate-in fade-in slide-in-from-top duration-200">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Senior Partner for {t.full_name}</label>
                              <select 
                                value={bulkSeniorPartnerMap[t.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setBulkSeniorPartnerMap(prev => ({ ...prev, [t.id]: val }))
                                }}
                                className="w-full px-2.5 py-1.5 border border-zinc-250 rounded-lg bg-white text-zinc-800 text-2xs focus:ring-2 focus:ring-emerald-500 outline-none"
                              >
                                <option value="">No Senior Partner (Independent Helper)</option>
                                {techniciansOnly.map(tech => (
                                  <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <button 
                    type="submit" 
                    disabled={isPending || selectedStaffIds.length === 0 || !clientName.trim() || !location.trim() || !startTime}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : `Dispatch Selected Team (${selectedStaffIds.length})`}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
