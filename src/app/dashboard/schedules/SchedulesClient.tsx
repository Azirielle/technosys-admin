"use client"
import { useState, useTransition } from "react"
import { Calendar as CalendarIcon, Clock, MapPin, Star, UserPlus, X, Loader2 } from "lucide-react"
import { createSchedule, toggleVipHook, createBulkSchedules } from "@/app/actions/schedules"
import { isRangeOverlapping } from "@/lib/utils"

export default function SchedulesClient({ 
  initialTechnicians, 
  initialHelpers,
  initialSchedules,
  approvedLeaves
}: { 
  initialTechnicians: any[], 
  initialHelpers: any[],
  initialSchedules: any[],
  approvedLeaves: any[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [techId, setTechId] = useState("")
  const [seniorPartnerId, setSeniorPartnerId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // Bulk Scheduling states
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkClientName, setBulkClientName] = useState("")
  const [bulkLocation, setBulkLocation] = useState("")
  const [bulkStartTime, setBulkStartTime] = useState("")
  const [bulkIsVip, setBulkIsVip] = useState(false)
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([])
  const [bulkErrorMsg, setBulkErrorMsg] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const handleOpenModal = () => {
    setTechId(initialTechnicians[0]?.id || initialHelpers[0]?.id || "")
    setSeniorPartnerId("")
    setStartTime("")
    setErrorMsg("")
    setShowModal(true)
  }

  const handleOpenBulkModal = () => {
    setBulkClientName("")
    setBulkLocation("")
    setBulkStartTime("")
    setBulkIsVip(false)
    setSelectedPersonnelIds([])
    setBulkErrorMsg("")
    setSearchQuery("")
    setShowBulkModal(true)
  }

  const handleCreateBulk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBulkErrorMsg("")
    
    startTransition(async () => {
      const res = await createBulkSchedules({
        personnelIds: selectedPersonnelIds,
        clientName: bulkClientName,
        location: bulkLocation,
        startTime: bulkStartTime,
        isVip: bulkIsVip
      })
      if (res?.error) {
        setBulkErrorMsg(res.error)
      } else {
        setShowBulkModal(false)
      }
    })
  }

  const getConflictingLeaveForBulk = (technicianId: string) => {
    if (!bulkStartTime || !technicianId) return null
    return approvedLeaves.find(leave => 
      leave.technician_id === technicianId &&
      isRangeOverlapping(bulkStartTime, null, leave.start_date, leave.end_date)
    )
  }

  const togglePersonnel = (id: string) => {
    setSelectedPersonnelIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const filteredTechnicians = initialTechnicians.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredHelpers = initialHelpers.filter(h => 
    h.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleAllTechs = () => {
    const visibleIds = filteredTechnicians.map(t => t.id)
    const allVisibleSelected = visibleIds.every(id => selectedPersonnelIds.includes(id))
    
    if (allVisibleSelected) {
      setSelectedPersonnelIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedPersonnelIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleToggleAllHelpers = () => {
    const visibleIds = filteredHelpers.map(h => h.id)
    const allVisibleSelected = visibleIds.every(id => selectedPersonnelIds.includes(id))
    
    if (allVisibleSelected) {
      setSelectedPersonnelIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedPersonnelIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const allVisibleTechsSelected = filteredTechnicians.length > 0 && filteredTechnicians.every(t => selectedPersonnelIds.includes(t.id))
  const allVisibleHelpersSelected = filteredHelpers.length > 0 && filteredHelpers.every(h => selectedPersonnelIds.includes(h.id))

  const bulkConflicts = selectedPersonnelIds
    .map(id => {
      const conflict = getConflictingLeaveForBulk(id)
      if (!conflict) return null
      const person = [...initialTechnicians, ...initialHelpers].find(p => p.id === id)
      return { person, conflict }
    })
    .filter(Boolean) as { person: any; conflict: any }[]


  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg("")
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const res = await createSchedule(formData)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setShowModal(false)
      }
    })
  }

  const handleToggleVip = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await toggleVipHook(id, currentStatus)
    })
  }

  const getConflictingLeave = (technicianId: string) => {
    if (!startTime || !technicianId) return null
    return approvedLeaves.find(leave => 
      leave.technician_id === technicianId &&
      isRangeOverlapping(startTime, null, leave.start_date, leave.end_date)
    )
  }

  const currentConflict = getConflictingLeave(techId)
  const partnerConflict = getConflictingLeave(seniorPartnerId)

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Schedules & Dispatch</h1>
          <p className="text-zinc-500 mt-1">Manage technician schedules and insert live VIP hooks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleOpenBulkModal}
            className="bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Bulk Schedule
          </button>
          <button 
            onClick={handleOpenModal}
            className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
          >
            <CalendarIcon className="w-4 h-4" /> New Schedule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Schedule List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-6">
              <CalendarIcon className="w-5 h-5 text-emerald-500" /> Active Itinerary
            </h2>
            
            <div className="space-y-4">
              {initialSchedules.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-xl text-zinc-500">
                  No schedules yet. Click "New Schedule" to create one.
                </div>
              ) : (
                initialSchedules.map(sched => (
                  <div 
                    key={sched.id} 
                    className={`p-5 rounded-xl border-l-4 relative overflow-hidden transition-all hover:shadow-md ${
                      sched.is_vip_hook 
                        ? "border-l-cyan-500 bg-cyan-50/30 border-y border-r border-y-cyan-100 border-r-cyan-100" 
                        : "border-l-zinc-300 bg-white border-y border-r border-y-zinc-200 border-r-zinc-200"
                    }`}
                  >
                    {sched.is_vip_hook && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Star className="w-3 h-3 fill-white" /> VIP Hook Inserted
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start">
                      <h3 className={`font-bold text-lg mb-3 ${sched.is_vip_hook ? "text-cyan-900 pr-32" : "text-zinc-800"}`}>
                        {sched.client_name}
                      </h3>
                      
                      <button 
                        onClick={() => handleToggleVip(sched.id, sched.is_vip_hook)}
                        disabled={isPending}
                        className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                          sched.is_vip_hook 
                            ? "bg-red-100 text-red-600 hover:bg-red-200" 
                            : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                        }`}
                      >
                        {sched.is_vip_hook ? "Remove VIP" : "Make VIP"}
                      </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-zinc-600 mb-4">
                      <div className="flex items-center gap-2 bg-zinc-100/80 px-3 py-1.5 rounded-md">
                        <Clock className="w-4 h-4 text-zinc-500" /> 
                        <span className="font-medium">
                          {new Date(sched.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {sched.end_time ? ` - ${new Date(sched.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ' (Open-Ended)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-zinc-100/80 px-3 py-1.5 rounded-md">
                        <MapPin className="w-4 h-4 text-zinc-500" /> 
                        <span className="font-medium">{sched.location}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-zinc-100 flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          sched.technician?.role === 'helper'
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {sched.technician?.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-zinc-500">Assigned to: </span>
                        <span className="font-semibold text-zinc-700">{sched.technician?.full_name || 'Unknown'}</span>
                        {sched.technician?.role && (
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded-full border ${
                            sched.technician.role === 'helper' 
                              ? 'bg-teal-50 text-teal-700 border-teal-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {sched.technician.role}
                          </span>
                        )}
                      </div>

                      {sched.senior_partner && (
                        <div className="flex items-center gap-2 pl-8 flex-wrap mt-1">
                          <span className="text-zinc-400 text-xs font-medium">↳ Partnered with:</span>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-indigo-100 text-indigo-700">
                            {sched.senior_partner.full_name?.charAt(0)}
                          </div>
                          <span className="font-semibold text-zinc-700">{sched.senior_partner.full_name}</span>
                          <span className="px-1.5 py-0.2 text-[9px] font-extrabold tracking-wider uppercase rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                            Lead Tech
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Side Panel for Technicians & Helpers */}
        <div className="space-y-6">
          {/* Technicians Category */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Live Technicians</h2>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {initialTechnicians.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {initialTechnicians.length === 0 ? (
                <p className="text-sm text-zinc-500">No technicians found. Go to Employees to register one.</p>
              ) : (
                initialTechnicians.map((tech) => (
                  <div key={tech.id} className="flex items-center gap-3 p-3 bg-indigo-50/20 rounded-lg border border-indigo-100 transition-colors hover:bg-indigo-50/40">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-inner">
                      {tech.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{tech.full_name}</p>
                      <p className="text-xs text-indigo-600 font-semibold">Technician</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Helpers Category */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Live Helpers</h2>
              <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {initialHelpers.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {initialHelpers.length === 0 ? (
                <p className="text-sm text-zinc-500">No helpers found. Go to Employees to register one.</p>
              ) : (
                initialHelpers.map((helper) => (
                  <div key={helper.id} className="flex items-center gap-3 p-3 bg-teal-50/20 rounded-lg border border-teal-100 transition-colors hover:bg-teal-50/40">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs shadow-inner">
                      {helper.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{helper.full_name}</p>
                      <p className="text-xs text-teal-600 font-semibold">Helper</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <h2 className="text-xl font-bold">New Schedule</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4 bg-zinc-50">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Assign Personnel</label>
                <select 
                  name="technicianId" 
                  required 
                  value={techId}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setTechId(newVal);
                    // Reset senior partner if selected person is not a helper
                    const isHelper = initialHelpers.some(h => h.id === newVal);
                    if (!isHelper) {
                      setSeniorPartnerId("");
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <optgroup label="Technicians">
                    {initialTechnicians.map(t => {
                      const hasConflict = approvedLeaves.some(leave => 
                        leave.technician_id === t.id &&
                        isRangeOverlapping(startTime, null, leave.start_date, leave.end_date)
                      )
                      return (
                        <option key={t.id} value={t.id}>
                          {t.full_name} {hasConflict ? "⚠️ (On Leave)" : ""}
                        </option>
                      )
                    })}
                  </optgroup>
                  <optgroup label="Helpers">
                    {initialHelpers.map(h => {
                      const hasConflict = approvedLeaves.some(leave => 
                        leave.technician_id === h.id &&
                        isRangeOverlapping(startTime, null, leave.start_date, leave.end_date)
                      )
                      return (
                        <option key={h.id} value={h.id}>
                          {h.full_name} {hasConflict ? "⚠️ (On Leave)" : ""}
                        </option>
                      )
                    })}
                  </optgroup>
                </select>
              </div>

              {initialHelpers.some(h => h.id === techId) && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Assign Senior Partner</label>
                  <select 
                    name="seniorPartnerId" 
                    value={seniorPartnerId}
                    onChange={(e) => setSeniorPartnerId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="none">No Senior Partner (None)</option>
                    {initialTechnicians.map(t => {
                      const hasConflict = approvedLeaves.some(leave => 
                        leave.technician_id === t.id &&
                        isRangeOverlapping(startTime, null, leave.start_date, leave.end_date)
                      )
                      return (
                        <option key={t.id} value={t.id}>
                          {t.full_name} {hasConflict ? "⚠️ (On Leave)" : ""}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Client Name / Job Title</label>
                <input name="clientName" required type="text" className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Acme Corp Maintenance" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Location</label>
                <input name="location" required type="text" className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="123 Ayala Ave, Makati" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Start Time</label>
                <input 
                  name="startTime" 
                  required 
                  type="datetime-local" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-cyan-50 border border-cyan-100 rounded-xl mt-2">
                <input type="checkbox" name="isVip" id="isVip" className="w-5 h-5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500" />
                <label htmlFor="isVip" className="text-sm font-semibold text-cyan-900 cursor-pointer">
                  Flag as VIP Hook (High Priority)
                </label>
              </div>

              {currentConflict && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold leading-relaxed">
                  ⚠️ <strong>Conflict Warning:</strong> Selected {initialHelpers.some(h => h.id === techId) ? "helper" : "technician"} has an approved leave ({currentConflict.leave_type}) from {new Date(currentConflict.start_date).toLocaleDateString()} to {new Date(currentConflict.end_date).toLocaleDateString()}. Please select another person or change the schedule timeframe.
                </div>
              )}

              {partnerConflict && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold leading-relaxed">
                  ⚠️ <strong>Partner Conflict Warning:</strong> Selected senior partner has an approved leave ({partnerConflict.leave_type}) from {new Date(partnerConflict.start_date).toLocaleDateString()} to {new Date(partnerConflict.end_date).toLocaleDateString()}. Please select another senior partner or change the schedule timeframe.
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold leading-relaxed">
                  ❌ <strong>Submission Failed:</strong> {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 font-medium text-zinc-600 hover:text-zinc-900">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isPending || !!currentConflict || (!!seniorPartnerId && seniorPartnerId !== "none" && !!partnerConflict)} 
                  className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Bulk Schedule Assignment</h2>
                <p className="text-xs text-zinc-500 mt-1">Assign multiple technicians and helpers to a single job dispatch.</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateBulk} className="p-6 space-y-5 bg-zinc-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Client Name / Job Title</label>
                    <input 
                      required 
                      type="text" 
                      value={bulkClientName}
                      onChange={(e) => setBulkClientName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
                      placeholder="Acme Corp Maintenance" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Location</label>
                    <input 
                      required 
                      type="text" 
                      value={bulkLocation}
                      onChange={(e) => setBulkLocation(e.target.value)}
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
                      placeholder="123 Ayala Ave, Makati" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Start Time</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={bulkStartTime}
                      onChange={(e) => setBulkStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                    <input 
                      type="checkbox" 
                      id="bulkIsVip" 
                      checked={bulkIsVip}
                      onChange={(e) => setBulkIsVip(e.target.checked)}
                      className="w-5 h-5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500" 
                    />
                    <label htmlFor="bulkIsVip" className="text-sm font-semibold text-cyan-900 cursor-pointer">
                      Flag as VIP Hook (High Priority)
                    </label>
                  </div>
                </div>

                <div className="flex flex-col h-full border border-zinc-200 rounded-xl bg-white p-4 overflow-hidden">
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-zinc-800 mb-2">Select Personnel ({selectedPersonnelIds.length} selected)</label>
                    <input 
                      type="text"
                      placeholder="Search personnel..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-64 space-y-4 pr-1">
                    {/* Technicians Group */}
                    <div>
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-1 mb-2">
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Technicians</span>
                        <button 
                          type="button" 
                          onClick={handleToggleAllTechs}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                        >
                          {allVisibleTechsSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      {filteredTechnicians.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No technicians match search.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {filteredTechnicians.map(t => {
                            const conflict = getConflictingLeaveForBulk(t.id)
                            const isSelected = selectedPersonnelIds.includes(t.id)
                            return (
                              <label 
                                key={t.id}
                                className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                                  conflict 
                                    ? isSelected
                                      ? "border-amber-300 bg-amber-50/50 hover:bg-amber-50 font-semibold text-amber-900 shadow-sm"
                                      : "border-zinc-200 bg-zinc-50 opacity-60 hover:bg-zinc-100"
                                    : isSelected
                                      ? "border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/40"
                                      : "border-zinc-100 hover:bg-zinc-50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePersonnel(t.id)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="font-medium text-zinc-700">{t.full_name}</span>
                                </div>
                                {conflict && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                    ⚠️ Leave Conflict
                                  </span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Helpers Group */}
                    <div>
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-1 mb-2">
                        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Helpers</span>
                        <button 
                          type="button" 
                          onClick={handleToggleAllHelpers}
                          className="text-[10px] font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider"
                        >
                          {allVisibleHelpersSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      {filteredHelpers.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No helpers match search.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {filteredHelpers.map(h => {
                            const conflict = getConflictingLeaveForBulk(h.id)
                            const isSelected = selectedPersonnelIds.includes(h.id)
                            return (
                              <label 
                                key={h.id}
                                className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                                  conflict 
                                    ? isSelected
                                      ? "border-amber-300 bg-amber-50/50 hover:bg-amber-50 font-semibold text-amber-900 shadow-sm"
                                      : "border-zinc-200 bg-zinc-50 opacity-60 hover:bg-zinc-100"
                                    : isSelected
                                      ? "border-teal-200 bg-teal-50/30 hover:bg-teal-50/40"
                                      : "border-zinc-100 hover:bg-zinc-50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePersonnel(h.id)}
                                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                                  />
                                  <span className="font-medium text-zinc-700">{h.full_name}</span>
                                </div>
                                {conflict && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                    ⚠️ Leave Conflict
                                  </span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {bulkConflicts.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold leading-relaxed space-y-1">
                  <p>⚠️ <strong>Conflict Warnings:</strong> The following selected personnel have approved leaves during this time:</p>
                  <ul className="list-disc pl-4 space-y-0.5 font-medium text-amber-700">
                    {bulkConflicts.map(({ person, conflict }) => (
                      <li key={person.id}>
                        {person.full_name} ({person.role}) is on approved {conflict.leave_type} leave from {new Date(conflict.start_date).toLocaleDateString()} to {new Date(conflict.end_date).toLocaleDateString()}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bulkErrorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold leading-relaxed">
                  ❌ <strong>Submission Failed:</strong> {bulkErrorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setShowBulkModal(false)} className="px-5 py-2.5 font-medium text-zinc-600 hover:text-zinc-900">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isPending || selectedPersonnelIds.length === 0 || bulkConflicts.length > 0} 
                  className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : `Save ${selectedPersonnelIds.length} Schedule(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
