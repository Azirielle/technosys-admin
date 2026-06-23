"use client"
import { useState, useTransition } from "react"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Star, 
  UserPlus,
  X, 
  Loader2, 
  Users, 
  User, 
  Check, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  CalendarDays,
  CalendarRange,
  GripVertical
} from "lucide-react"
import { createSchedule, bulkCreateSchedules, toggleVipHook } from "@/app/actions/schedules"
import { useRouter } from "next/navigation"

const getLeaveRangeMs = (startDate: string, endDate: string) => {
  const start = startDate.includes('T') ? new Date(startDate).getTime() : new Date(`${startDate}T00:00:00.000Z`).getTime()
  const end = endDate.includes('T') ? new Date(endDate).getTime() : new Date(`${endDate}T23:59:59.999Z`).getTime()
  return { start, end }
}

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function SchedulesClient({ 
  initialStaff, 
  initialSchedules,
  approvedLeaves,
  isWriteAllowed = false
}: { 
  initialStaff: any[], 
  initialSchedules: any[],
  approvedLeaves: any[],
  isWriteAllowed?: boolean
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [scheduleType, setScheduleType] = useState<'single' | 'bulk'>('single')
  
  const [techId, setTechId] = useState("")
  const [seniorPartnerId, setSeniorPartnerId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [clientName, setClientName] = useState("")
  const [location, setLocation] = useState("")
  const [attendanceMode, setAttendanceMode] = useState("hq")
  const [allowanceRate, setAllowanceRate] = useState<number>(0)
  const [isVip, setIsVip] = useState(false)
  
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [bulkSeniorPartnerMap, setBulkSeniorPartnerMap] = useState<Record<string, string>>({})
  
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month')
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string, name: string) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ id, name }))
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    if (isWriteAllowed) {
      e.preventDefault()
    }
  }

  const handleDragEnter = (e: React.DragEvent, dateKey: string) => {
    if (isWriteAllowed) {
      e.preventDefault()
      setDraggedOverDate(dateKey)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (isWriteAllowed) {
      e.preventDefault()
      setDraggedOverDate(null)
    }
  }

  const handleDrop = (e: React.DragEvent, date: Date) => {
    if (!isWriteAllowed) return
    e.preventDefault()
    setDraggedOverDate(null)
    try {
      const dataStr = e.dataTransfer.getData("application/json")
      if (!dataStr) return
      const { id } = JSON.parse(dataStr)
      if (!id) return

      // Pre-fill fields for the technician and date
      setTechId(id)
      
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const formattedDate = `${y}-${m}-${day}T08:00`
      setStartTime(formattedDate)
      
      // Open modal with pre-filled inputs
      setSeniorPartnerId("")
      setClientName("")
      setLocation("")
      setAttendanceMode("hq")
      setAllowanceRate(0)
      setIsVip(false)
      setSelectedStaffIds([])
      setBulkSeniorPartnerMap({})
      setErrorMsg("")
      setSuccessMsg("")
      setShowModal(true)
    } catch (err) {
      console.error("Drop failed:", err)
    }
  }

  const techniciansOnly = initialStaff.filter(t => t.role === 'technician')

  const generateMonthDays = (baseDate: Date) => {
    const year = baseDate.getFullYear()
    const month = baseDate.getMonth()
    
    const firstDayIndex = new Date(year, month, 1).getDay()
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    
    const days = []
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, daysInPrevMonth - i))
    }
    
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }

  const generateWeekDays = (baseDate: Date) => {
    const current = new Date(baseDate)
    const day = current.getDay()
    const diff = current.getDate() - day
    const startOfWeek = new Date(current.setDate(diff))
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }

  const getWeekRangeString = (baseDate: Date) => {
    const weekDays = generateWeekDays(baseDate)
    const start = weekDays[0]
    const end = weekDays[6]
    
    const startMonth = start.toLocaleString('default', { month: 'short' })
    const endMonth = end.toLocaleString('default', { month: 'short' })
    
    if (start.getFullYear() !== end.getFullYear()) {
      return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
    }
    if (start.getMonth() !== end.getMonth()) {
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
  }

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))
    } else {
      setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), currentMonthDate.getDate() - 7))
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))
    } else {
      setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), currentMonthDate.getDate() + 7))
    }
  }

  const handleGoToday = () => {
    setCurrentMonthDate(new Date())
  }

  const getLeavesForDate = (date: Date) => {
    const dateStr = getLocalDateString(date)
    return approvedLeaves.filter(leave => {
      const leaveStartStr = leave.start_date.split('T')[0]
      const leaveEndStr = leave.end_date.split('T')[0]
      return dateStr >= leaveStartStr && dateStr <= leaveEndStr
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

  const getTechStatusToday = (techId: string) => {
    const todayStr = getLocalDateString(new Date())
    
    const hasLeaveToday = approvedLeaves.some(leave => {
      if (leave.technician_id !== techId) return false
      const leaveStart = leave.start_date.split('T')[0]
      const leaveEnd = leave.end_date.split('T')[0]
      return todayStr >= leaveStart && todayStr <= leaveEnd
    })
    
    if (hasLeaveToday) return { label: "On Leave", color: "bg-rose-50 border-rose-100 text-rose-700 font-extrabold" }
    
    const isScheduledToday = initialSchedules.some(sched => {
      if (sched.technician_id !== techId && sched.senior_partner_id !== techId) return false
      const schedDateStr = getLocalDateString(new Date(sched.start_time))
      return schedDateStr === todayStr
    })
    
    if (isScheduledToday) return { label: "Dispatched", color: "bg-amber-50 border-amber-200 text-amber-700 font-extrabold" }
    
    return { label: "Available", color: "bg-emerald-50 border-emerald-150 text-emerald-750 font-extrabold" }
  }

  const handleOpenModal = () => {
    setTechId(initialStaff[0]?.id || "")
    setSeniorPartnerId("")
    setStartTime("")
    setClientName("")
    setLocation("")
    setAttendanceMode("hq")
    setAllowanceRate(0)
    setIsVip(false)
    setSelectedStaffIds([])
    setBulkSeniorPartnerMap({})
    setErrorMsg("")
    setSuccessMsg("")
    setShowModal(true)
  }

  const handleOpenModalWithDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const formattedDate = `${y}-${m}-${day}T08:00`
    
    setTechId(initialStaff[0]?.id || "")
    setSeniorPartnerId("")
    setStartTime(formattedDate)
    setClientName("")
    setLocation("")
    setAttendanceMode("hq")
    setAllowanceRate(0)
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
    formData.append("allowanceRate", allowanceRate.toString())
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
        isVip,
        allowanceRate
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

  const selectedStaffHasHelper = initialStaff.find(t => t.id === techId)?.role === 'helper'

  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filteredSchedules = initialSchedules.filter(sched => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const techName = sched.technician?.full_name?.toLowerCase() || ""
    const partnerName = sched.senior_partner?.full_name?.toLowerCase() || ""
    const clientName = sched.client_name?.toLowerCase() || ""
    const loc = sched.location?.toLowerCase() || ""
    return techName.includes(query) || partnerName.includes(query) || clientName.includes(query) || loc.includes(query)
  })

  const schedulesByDate: Record<string, any[]> = {}
  filteredSchedules.forEach(sched => {
    if (!sched.start_time) return
    const key = getLocalDateString(new Date(sched.start_time))
    if (!schedulesByDate[key]) {
      schedulesByDate[key] = []
    }
    schedulesByDate[key].push(sched)
  })

  const monthDays = generateMonthDays(currentMonthDate)
  const weekDays = generateWeekDays(currentMonthDate)
  const todayStr = getLocalDateString(new Date())

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Schedules & Dispatch</h1>
          <p className="text-zinc-500 mt-1">Manage technician itineraries, pair helper-tech teams, and set custom DTR modes.</p>
        </div>
        {isWriteAllowed && (
          <button 
            onClick={handleOpenModal}
            className="bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4" /> Dispatch Assignment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-extrabold text-zinc-900 min-w-[140px]">
                  {viewMode === 'month' ? `${months[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}` : getWeekRangeString(currentMonthDate)}
                </h2>
                <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-0.5 shadow-2xs">
                  <button 
                    onClick={handlePrev} 
                    className="p-1.5 hover:bg-zinc-50 text-zinc-600 rounded-md transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleGoToday} 
                    className="px-2.5 py-1 text-xs font-bold hover:bg-zinc-50 text-zinc-800 rounded-md transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="p-1.5 hover:bg-zinc-50 text-zinc-600 rounded-md transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search schedules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none w-40 sm:w-48 transition-all"
                  />
                </div>

                <div className="flex bg-zinc-200/60 p-0.5 rounded-lg border border-zinc-200">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'month' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Month
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'week' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    <CalendarRange className="w-3.5 h-3.5" /> Week
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'list' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> List
                  </button>
                </div>

                {isWriteAllowed && (
                  <button
                    onClick={handleOpenModal}
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-lg transition-all shadow-2xs cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                )}
              </div>
            </div>

            {viewMode === 'month' && (
              <div className="flex flex-col">
                <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/50">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="py-2 text-center text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold border-r last:border-r-0 border-zinc-150">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 bg-zinc-150 gap-px">
                  {monthDays.map((dayDate, idx) => {
                    const dateKey = getLocalDateString(dayDate)
                    const dayScheds = schedulesByDate[dateKey] || []
                    const dayLeaves = getLeavesForDate(dayDate)
                    const isCurrentMonth = dayDate.getMonth() === currentMonthDate.getMonth()
                    const isToday = dateKey === todayStr

                    const isDraggedOver = dateKey === draggedOverDate
                    return (
                      <div 
                        key={idx} 
                        onDragOver={(e) => handleDragOver(e, dateKey)}
                        onDragEnter={(e) => handleDragEnter(e, dateKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dayDate)}
                        className={`min-h-[105px] flex flex-col p-1.5 transition-all relative group ${
                          isDraggedOver 
                            ? 'bg-emerald-50/40 ring-2 ring-inset ring-emerald-500 z-10 scale-[1.01]' 
                            : 'bg-white hover:bg-zinc-50/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${
                            isToday 
                              ? 'bg-zinc-950 text-white rounded-full w-5.5 h-5.5 flex items-center justify-center text-[11px]' 
                              : isCurrentMonth ? 'text-zinc-700' : 'text-zinc-300'
                          }`}>
                            {dayDate.getDate()}
                          </span>
                          {isWriteAllowed && (
                            <button
                              onClick={() => handleOpenModalWithDate(dayDate)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 rounded-md cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px] pr-0.5 custom-scrollbar">
                          {dayScheds.map(sched => (
                            <button
                              key={sched.id}
                              onClick={() => setSelectedSchedule(sched)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg border w-full text-left truncate block transition-all hover:shadow-2xs cursor-pointer ${
                                !sched.technician
                                  ? 'bg-amber-50 border-amber-250 text-amber-850 hover:bg-amber-100/60'
                                  : sched.is_vip_hook 
                                  ? 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100/70' 
                                  : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-150/70'
                              }`}
                            >
                              <span className="flex items-center gap-0.5">
                                {sched.is_vip_hook && <Star className="w-2.5 h-2.5 text-cyan-600 fill-cyan-500 shrink-0" />}
                                <span className="truncate">
                                  {sched.technician?.full_name ? sched.technician.full_name.split(' ')[0] : 'Unassigned'}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>

                        {dayLeaves.length > 0 && (
                          <div className="mt-1 flex items-center justify-end">
                            <span 
                              className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-1 rounded-sm scale-90"
                              title={`${dayLeaves.length} staff on leave`}
                            >
                              {dayLeaves.length} Leave
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {viewMode === 'week' && (
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weekDays.map((dayDate, idx) => {
                    const dateKey = getLocalDateString(dayDate)
                    const dayScheds = schedulesByDate[dateKey] || []
                    const dayLeaves = getLeavesForDate(dayDate)
                    const isToday = dateKey === todayStr
                    const weekdayName = dayDate.toLocaleDateString(undefined, { weekday: 'short' })

                    const isDraggedOver = dateKey === draggedOverDate
                    return (
                      <div 
                        key={idx} 
                        onDragOver={(e) => handleDragOver(e, dateKey)}
                        onDragEnter={(e) => handleDragEnter(e, dateKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dayDate)}
                        className={`flex flex-col border rounded-xl overflow-hidden min-h-[300px] transition-all duration-150 ${
                          isDraggedOver 
                            ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-inset ring-emerald-500 scale-[1.01]' 
                            : 'border-zinc-200 bg-zinc-50/20'
                        }`}
                      >
                        <div className={`p-3 border-b text-center flex flex-col justify-center items-center ${
                          isToday ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-zinc-100/50 border-zinc-200'
                        }`}>
                          <span className={`text-[9px] uppercase font-mono tracking-wider font-extrabold ${isToday ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            {weekdayName}
                          </span>
                          <span className={`text-base font-extrabold mt-0.5 ${isToday ? 'text-white' : 'text-zinc-800'}`}>
                            {dayDate.getDate()}
                          </span>
                        </div>

                        {isWriteAllowed && (
                          <div className="p-2 border-b border-dashed border-zinc-200 flex justify-center">
                            <button
                              onClick={() => handleOpenModalWithDate(dayDate)}
                              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 bg-white hover:bg-zinc-100 px-2 py-1 rounded border border-zinc-200 shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add Dispatch
                            </button>
                          </div>
                        )}

                        <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[350px] custom-scrollbar">
                          {dayScheds.length === 0 ? (
                            <p className="text-[10px] text-zinc-400 italic text-center py-4">No dispatches</p>
                          ) : (
                            dayScheds.map(sched => (
                              <button
                                key={sched.id}
                                onClick={() => setSelectedSchedule(sched)}
                                className={`w-full p-2.5 rounded-xl border text-left flex flex-col transition-all hover:shadow-md cursor-pointer ${
                                  !sched.technician
                                    ? 'bg-amber-50 border-amber-200 text-amber-850'
                                    : sched.is_vip_hook 
                                    ? 'bg-cyan-50 border-cyan-200 text-cyan-800' 
                                    : 'bg-white border-zinc-250 text-zinc-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1 w-full">
                                  <span className="text-[10px] font-extrabold tracking-tight truncate leading-tight flex-1">
                                    {sched.client_name}
                                  </span>
                                  {sched.is_vip_hook && <Star className="w-3 h-3 text-cyan-600 fill-cyan-500 shrink-0" />}
                                </div>

                                <div className="mt-1.5 flex flex-col gap-0.5 text-[9px] text-zinc-500">
                                  <span className="flex items-center gap-1 truncate">
                                    <Clock className="w-2.5 h-2.5 shrink-0" />
                                    {new Date(sched.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    {sched.location}
                                  </span>
                                </div>

                                <div className="mt-2.5 pt-1.5 border-t border-zinc-100 flex items-center gap-1">
                                  <div className="w-4.5 h-4.5 rounded-full bg-zinc-800 text-white text-[8px] font-bold flex items-center justify-center">
                                    {sched.technician?.full_name?.charAt(0) || '?'}
                                  </div>
                                  <span className="text-[9px] font-bold text-zinc-600 truncate">
                                    {sched.technician?.full_name || 'Unassigned'}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>

                        {dayLeaves.length > 0 && (
                          <div className="p-2 bg-rose-50/50 border-t border-rose-100 text-[9px] text-rose-700 font-bold">
                            <span className="flex items-center gap-1 justify-center">
                              ⚠️ {dayLeaves.length} on leave
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {viewMode === 'list' && (
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar bg-zinc-50/20">
                {filteredSchedules.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl text-zinc-500 italic">
                    No active dispatches found matching the filters.
                  </div>
                ) : (
                  filteredSchedules.map(sched => (
                    <div 
                      key={sched.id} 
                      className={`p-5 rounded-xl border relative overflow-hidden transition-all hover:shadow-md bg-white ${
                        !sched.technician
                          ? "border-amber-250 bg-amber-50/10"
                          : sched.is_vip_hook 
                          ? "border-cyan-200 bg-cyan-50/10" 
                          : "border-zinc-200"
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
                          <h3 className={`font-bold text-base ${sched.is_vip_hook ? "text-cyan-900 pr-32" : "text-zinc-800"}`}>
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
                              ? "bg-red-50 text-red-600 border-red-150 hover:bg-red-100" 
                              : "bg-cyan-50 text-cyan-700 border-cyan-150 hover:bg-cyan-100"
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
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" /> Field workforce
            </h2>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {initialStaff.length === 0 ? (
                <p className="text-sm text-zinc-500">No staff found. Register profiles in Employees page first.</p>
              ) : (
                initialStaff.map((tech) => {
                  const status = getTechStatusToday(tech.id)

                  return (
                    <div 
                      key={tech.id}
                      draggable={isWriteAllowed}
                      onDragStart={isWriteAllowed ? (e) => handleDragStart(e, tech.id, tech.full_name) : undefined}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                        isWriteAllowed 
                          ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-white hover:shadow-2xs cursor-grab active:cursor-grabbing select-none' 
                          : 'bg-zinc-50 border-zinc-200 opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isWriteAllowed && (
                          <GripVertical className="w-3.5 h-3.5 text-zinc-400 shrink-0 cursor-grab active:cursor-grabbing -ml-1 mr-0.5" />
                        )}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-250 to-zinc-355 flex items-center justify-center text-zinc-700 font-bold text-xs shadow-inner">
                          {tech.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 text-sm truncate">{tech.full_name}</p>
                          <p className="text-[10px] text-zinc-500 font-semibold">{tech.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-extrabold uppercase ${
                          tech.role === 'helper' 
                            ? 'bg-teal-50 border-teal-150 text-teal-700' 
                            : 'bg-indigo-50 border-indigo-150 text-indigo-700'
                        }`}>
                          {tech.role}
                        </span>
                        
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedSchedule && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-150 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                  selectedSchedule.is_vip_hook 
                    ? 'bg-cyan-50 border-cyan-200 text-cyan-800 font-extrabold' 
                    : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                }`}>
                  {selectedSchedule.is_vip_hook ? '⭐ VIP Dispatch Active' : 'Standard Dispatch'}
                </span>
                <h3 className="text-lg font-extrabold text-zinc-900 mt-2.5 leading-snug">{selectedSchedule.client_name}</h3>
              </div>
              <button 
                onClick={() => setSelectedSchedule(null)}
                className="p-1.5 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-850 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Deploy Employee</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">
                      {selectedSchedule.technician?.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="font-bold text-zinc-700">{selectedSchedule.technician?.full_name || 'Unassigned'}</span>
                  </div>
                </div>
                
                {selectedSchedule.senior_partner?.full_name && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Partnered With</span>
                    <span className="font-bold text-zinc-700">{selectedSchedule.senior_partner.full_name}</span>
                  </div>
                )}
                
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Location / Site Address</span>
                  <div className="flex items-center gap-1.5 text-zinc-700 font-semibold">
                    <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{selectedSchedule.location}</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Schedule Timing</span>
                  <div className="flex items-center gap-1.5 text-zinc-700 font-semibold bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                    <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>
                      {new Date(selectedSchedule.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {selectedSchedule.end_time ? ` - ${new Date(selectedSchedule.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : " (Continuous / Clock-out required)"}
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">DTR Mode</span>
                  <span className="font-semibold text-zinc-700 capitalize">
                    {selectedSchedule.attendance_mode === 'hq' ? 'Pacita HQ standard' : selectedSchedule.attendance_mode === 'direct_dispatch' ? 'Direct Dispatch' : 'Out of Town'}
                  </span>
                </div>
                
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Allowance Rate</span>
                  <span className="font-semibold text-zinc-700">
                    ₱{selectedSchedule.allowance_rate || 0} / day
                  </span>
                </div>
              </div>

              {!selectedSchedule.technician && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Staff Unassigned</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      The assigned employee has approved leave during this time. Please adjust schedule or change employee.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {isWriteAllowed && (
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-3">
                <button 
                  onClick={() => {
                    handleToggleVip(selectedSchedule.id, selectedSchedule.is_vip_hook)
                    setSelectedSchedule(null)
                  }}
                  disabled={isPending}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all border cursor-pointer text-center ${
                    selectedSchedule.is_vip_hook 
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
                  }`}
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : selectedSchedule.is_vip_hook ? '❌ Remove VIP Status' : '⭐ Make VIP Schedule'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-end backdrop-blur-xs">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-zinc-150 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-950">Dispatch Assignment</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Deploy technicians or helper pairings to site itineraries.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-zinc-150 px-6">
              <button 
                type="button"
                onClick={() => {
                  setScheduleType('single')
                  setErrorMsg("")
                  setSuccessMsg("")
                }}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer ${
                  scheduleType === 'single' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-400 hover:text-zinc-850'
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
                  scheduleType === 'bulk' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-400 hover:text-zinc-850'
                }`}
              >
                <Users className="w-4 h-4" /> Bulk Team Dispatch
              </button>
            </div>

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

              <div className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Itinerary & Location Details</h3>
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Client Name / Job Title</label>
                  <input required type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. Pacita Mall Aircon Cleaning" />
                </div>
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Location / Site Address</label>
                  <input required type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. San Pedro, Laguna" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Start Time</label>
                    <input required type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Attendance Tracking Mode</label>
                    <select 
                      value={attendanceMode} 
                      onChange={(e) => {
                        const val = e.target.value
                        setAttendanceMode(val)
                        if (val === 'hq') setAllowanceRate(0)
                        else if (val === 'direct_dispatch') setAllowanceRate(200)
                        else if (val === 'out_of_town') setAllowanceRate(500)
                      }} 
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                      <option value="hq">HQ Biometric Standard (Pacita)</option>
                      <option value="direct_dispatch">On-Site Direct Dispatch (No Bio)</option>
                      <option value="out_of_town">Out-of-Town Mode (Continuous)</option>
                    </select>
                  </div>
                </div>
                {attendanceMode !== 'hq' && (
                  <div className="animate-in fade-in slide-in-from-top duration-200">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Allowance Rate (₱ / day)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={allowanceRate} 
                      onChange={(e) => setAllowanceRate(parseFloat(e.target.value) || 0)} 
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                      placeholder="e.g. 200"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 p-3.5 bg-cyan-50/40 border border-cyan-150 rounded-xl">
                  <input type="checkbox" id="isVip" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} className="w-5 h-5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" />
                  <label htmlFor="isVip" className="text-xs font-bold text-cyan-900 cursor-pointer select-none">Flag as VIP Hook (High Priority Dispatch)</label>
                </div>
              </div>

              {scheduleType === 'single' && (
                <form onSubmit={handleCreateSingle} className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Staff & Pairing Configuration</h3>
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Deploy Employee</label>
                    <select required value={techId} onChange={(e) => { setTechId(e.target.value); setSeniorPartnerId("") }} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
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
                      <select value={seniorPartnerId} onChange={(e) => setSeniorPartnerId(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-250 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="">No Senior Partner (Independent Helper)</option>
                        {techniciansOnly.map(tech => <option key={tech.id} value={tech.id}>{tech.full_name}</option>)}
                      </select>
                    </div>
                  )}

                  {currentConflict && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-2xs font-semibold leading-normal flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>The selected worker is on approved leave during this time. Please adjust schedule or change worker.</span>
                    </div>
                  )}

                  <button type="submit" disabled={isPending || !!currentConflict || !clientName.trim() || !location.trim() || !startTime} className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98">
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Dispatch Schedule"}
                  </button>
                </form>
              )}

              {scheduleType === 'bulk' && (
                <form onSubmit={handleCreateBulk} className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Team Selection & Individual Pairings</h3>
                  
                  {!startTime && (
                    <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-700 mb-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
                      <span>Select a <strong>Start Date &amp; Time</strong> above to see staff leave availability before selecting team members.</span>
                    </div>
                  )}

                  <div className="space-y-2 max-h-52 overflow-y-auto border border-zinc-200 rounded-xl p-3 bg-zinc-50/30 pr-1">
                    {initialStaff.map((t) => {
                      const isChecked = selectedStaffIds.includes(t.id)
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
                            <span className="text-xs font-semibold text-zinc-700">{t.full_name} ({t.role}) {hasConflict ? "⚠️ (On Leave)" : ""}</span>
                          </label>
                          {isChecked && t.role === 'helper' && (
                            <div className="ml-7">
                              <select value={bulkSeniorPartnerMap[t.id] || ""} onChange={(e) => setBulkSeniorPartnerMap(prev => ({ ...prev, [t.id]: e.target.value }))} className="w-full px-2.5 py-1.5 border border-zinc-250 rounded-lg bg-white text-zinc-800 text-2xs focus:ring-2 focus:ring-emerald-500 outline-none">
                                <option value="">No Senior Partner (Independent Helper)</option>
                                {techniciansOnly.map(tech => <option key={tech.id} value={tech.id}>{tech.full_name}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <button type="submit" disabled={isPending || selectedStaffIds.length === 0 || !clientName.trim() || !location.trim() || !startTime} className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98">
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
