"use client"
import { useState, useTransition } from "react"
import MapAutocomplete from "@/components/MapAutocomplete"
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
  ChevronDown,
  Search,
  Plus,
  CalendarDays,
  CalendarRange,
  GripVertical
} from "lucide-react"
import { createSchedule, bulkCreateSchedules, toggleVipHook, updateSchedule, deleteSchedule } from "@/app/actions/schedules"
import { useRouter } from "next/navigation"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"

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
  const { alert, confirm } = useAlertConfirm()
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [scheduleType, setScheduleType] = useState<'single' | 'bulk'>('single')
  
  const [techId, setTechId] = useState("")
  const [seniorPartnerId, setSeniorPartnerId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [destinations, setDestinations] = useState<any[]>([{ clientName: "", location: "", geofenceLat: null, geofenceLng: null, geofenceRadius: 500 }])
  const [attendanceMode, setAttendanceMode] = useState("direct_dispatch")
  const [allowanceRate, setAllowanceRate] = useState<number>(200)
  const clientName = destinations[0]?.clientName || ""
  const location = destinations[0]?.location || ""
  const [isVip, setIsVip] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [bulkSeniorPartnerMap, setBulkSeniorPartnerMap] = useState<Record<string, string>>({})
  
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Custom dropdown and paginations for Dispatch Form
  const [techSearch, setTechSearch] = useState("")
  const [techRoleFilter, setTechRoleFilter] = useState<'all' | 'technician' | 'helper'>('all')
  const [techPage, setTechPage] = useState(1)
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false)

  const [partnerSearch, setPartnerSearch] = useState("")
  const [partnerPage, setPartnerPage] = useState(1)
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false)

  const [bulkSearch, setBulkSearch] = useState("")
  const [bulkRoleFilter, setBulkRoleFilter] = useState<'all' | 'technician' | 'helper'>('all')
  const [bulkPage, setBulkPage] = useState(1)

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month')
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null)
  const [workforceQuery, setWorkforceQuery] = useState("")

  const handleDragStart = (e: React.DragEvent, type: 'technician' | 'schedule', data: any) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ type, data }))
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
      setDestinations([{ clientName: "", location: "", geofenceLat: null, geofenceLng: null, geofenceRadius: 500 }])
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
    setEditingScheduleId(null)
    setTechId(initialStaff[0]?.id || "")
    setSeniorPartnerId("")
    setStartTime("")
    setDestinations([{ clientName: "", location: "", geofenceLat: null, geofenceLng: null, geofenceRadius: 500 }])
    setAttendanceMode("direct_dispatch")
    setAllowanceRate(200)
    setIsVip(false)
    setSelectedStaffIds([])
    setBulkSeniorPartnerMap({})
    setErrorMsg("")
    setSuccessMsg("")
    setTechSearch("")
    setTechRoleFilter('all')
    setTechPage(1)
    setIsTechDropdownOpen(false)
    setPartnerSearch("")
    setPartnerPage(1)
    setIsPartnerDropdownOpen(false)
    setBulkSearch("")
    setBulkRoleFilter('all')
    setBulkPage(1)
    setShowModal(true)
  }

  const handleOpenModalWithDate = (date: Date) => {
    setEditingScheduleId(null)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const formattedDate = `${y}-${m}-${day}T08:00`
    
    setTechId(initialStaff[0]?.id || "")
    setSeniorPartnerId("")
    setStartTime(formattedDate)
    setDestinations([{ clientName: "", location: "", geofenceLat: null, geofenceLng: null, geofenceRadius: 500 }])
    setAttendanceMode("direct_dispatch")
    setAllowanceRate(200)
    setIsVip(false)
    setSelectedStaffIds([])
    setBulkSeniorPartnerMap({})
    setErrorMsg("")
    setSuccessMsg("")
    setTechSearch("")
    setTechRoleFilter('all')
    setTechPage(1)
    setIsTechDropdownOpen(false)
    setPartnerSearch("")
    setPartnerPage(1)
    setIsPartnerDropdownOpen(false)
    setBulkSearch("")
    setBulkRoleFilter('all')
    setBulkPage(1)
    setSuccessMsg("")
    setShowModal(true)
  }

  const handleDeleteSchedule = async (schedId: string) => {
    const ok = await confirm("Are you sure you want to delete this schedule?", "Confirm Deletion", "destructive")
    if (!ok) return
    setSelectedSchedule(null)
    const res = await deleteSchedule(schedId)
    if (res?.error) setErrorMsg(res.error)
    else {
      setSuccessMsg("Schedule deleted successfully!")
      setTimeout(() => setSuccessMsg(""), 3000)
    }
  }

  const handleEditSchedule = (sched: any) => {
    setEditingScheduleId(sched.id)
    setTechId(sched.technician_id || "")
    setSeniorPartnerId(sched.senior_partner_id || "")
    if (sched.start_time) {
      const d = new Date(sched.start_time)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      setStartTime(`${y}-${m}-${day}T${h}:${min}`)
    } else {
      setStartTime("")
    }
    
    setDestinations([{
      clientName: sched.client_name || "",
      location: sched.location || "",
      geofenceLat: sched.geofence_lat || null,
      geofenceLng: sched.geofence_lng || null,
      geofenceRadius: sched.geofence_radius || 500
    }])
    setAttendanceMode(sched.attendance_mode || "hq")
    setAllowanceRate(sched.allowance_rate || 200)
    setIsVip(sched.is_vip_hook || false)
    setSelectedSchedule(null)
    setScheduleType('single')
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
    formData.append("destinations", JSON.stringify(destinations))
    formData.append("clientName", destinations[0].clientName)
    formData.append("location", destinations[0].location)
    formData.append("startTime", startTime)
    formData.append("attendanceMode", attendanceMode)
    formData.append("allowanceRate", allowanceRate.toString())
    if (isHelper && seniorPartnerId) {
      formData.append("seniorPartnerId", seniorPartnerId)
    }
    if (isVip) {
      formData.append("isVip", "on")
    }
    if (editingScheduleId) {
      formData.append("scheduleId", editingScheduleId)
    }
    
    startTransition(async () => {
      const res = editingScheduleId ? await updateSchedule(formData) : await createSchedule(formData)
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

    if (attendanceMode === 'out_of_town') {
      const selectedStaffObjects = initialStaff.filter(t => selectedStaffIds.includes(t.id))
      const hasSeniorTech = selectedStaffObjects.some(t => t.role !== 'helper')
      if (!hasSeniorTech) {
        setErrorMsg("Out-of-Town deployments require at least one Senior Technician in the team.")
        return
      }
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

  const filteredStaff = initialStaff.filter(tech => {
    if (!workforceQuery) return true
    const query = workforceQuery.toLowerCase()
    const name = tech.full_name?.toLowerCase() || ""
    const email = tech.email?.toLowerCase() || ""
    const role = tech.role?.toLowerCase() || ""
    return name.includes(query) || email.includes(query) || role.includes(query)
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

  // Paginations for Dispatch Modal Selector lists
  const filteredSingleTechs = initialStaff.filter((t) => {
    const fullName = (t.full_name || '').toLowerCase()
    const matchesSearch = fullName.includes(techSearch.toLowerCase())
    const matchesRole = techRoleFilter === 'all' || t.role === techRoleFilter
    return matchesSearch && matchesRole
  })

  const singleTechsPerPage = 5
  const singleTechsTotalPages = Math.ceil(filteredSingleTechs.length / singleTechsPerPage) || 1
  const singleTechsCurrentPage = Math.min(techPage, singleTechsTotalPages)
  const singleTechsStartIndex = (singleTechsCurrentPage - 1) * singleTechsPerPage
  const paginatedSingleTechs = filteredSingleTechs.slice(singleTechsStartIndex, singleTechsStartIndex + singleTechsPerPage)

  const filteredPartners = techniciansOnly.filter((t) => {
    const fullName = (t.full_name || '').toLowerCase()
    return fullName.includes(partnerSearch.toLowerCase())
  })

  const partnerPerPage = 5
  const partnerTotalPages = Math.ceil(filteredPartners.length / partnerPerPage) || 1
  const partnerCurrentPage = Math.min(partnerPage, partnerTotalPages)
  const partnerStartIndex = (partnerCurrentPage - 1) * partnerPerPage
  const paginatedPartners = filteredPartners.slice(partnerStartIndex, partnerStartIndex + partnerPerPage)

  const filteredBulkStaff = initialStaff.filter((t) => {
    const fullName = (t.full_name || '').toLowerCase()
    const matchesSearch = fullName.includes(bulkSearch.toLowerCase())
    const matchesRole = bulkRoleFilter === 'all' || t.role === bulkRoleFilter
    return matchesSearch && matchesRole
  })

  const bulkStaffPerPage = 5
  const bulkStaffTotalPages = Math.ceil(filteredBulkStaff.length / bulkStaffPerPage) || 1
  const bulkStaffCurrentPage = Math.min(bulkPage, bulkStaffTotalPages)
  const bulkStaffStartIndex = (bulkStaffCurrentPage - 1) * bulkStaffPerPage
  const paginatedBulkStaff = filteredBulkStaff.slice(bulkStaffStartIndex, bulkStaffStartIndex + bulkStaffPerPage)

  const selectedTech = initialStaff.find(t => t.id === techId)
  const selectedPartner = techniciansOnly.find(t => t.id === seniorPartnerId)

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
            
            <div className="p-4 border-b border-zinc-150 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/50">
              {/* Left Side: Month Title & Navigation */}
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                  {viewMode === 'month' ? `${months[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}` : getWeekRangeString(currentMonthDate)}
                </h2>
                <div className="flex items-center bg-white border border-zinc-200/80 rounded-xl p-0.5 shadow-3xs">
                  <button 
                    onClick={handlePrev} 
                    className="p-1 hover:bg-zinc-50 text-zinc-550 hover:text-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={handleGoToday} 
                    className="px-2 py-0.5 text-[10px] font-extrabold hover:bg-zinc-50 text-zinc-855 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Today
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="p-1 hover:bg-zinc-50 text-zinc-550 hover:text-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Side: Search & View Modes */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
                <div className="relative flex-1 md:flex-none">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-6 py-1.5 border border-zinc-200 rounded-xl bg-white text-zinc-855 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-355 w-full md:w-40 lg:w-48 transition-all shadow-3xs placeholder:text-zinc-450 placeholder:font-semibold"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 text-xs font-bold px-1"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex bg-zinc-105 p-0.5 rounded-xl border border-zinc-200 shadow-inner shrink-0 bg-zinc-100">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'month' 
                        ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/30' 
                        : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    <CalendarDays className="w-3 h-3" /> Month
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'week' 
                        ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/30' 
                        : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    <CalendarRange className="w-3 h-3" /> Week
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'list' 
                        ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/30' 
                        : 'text-zinc-500 hover:text-zinc-850'
                    }`}
                  >
                    <Users className="w-3 h-3" /> List
                  </button>
                </div>

                
              </div>
            </div>

            {viewMode === 'month' && (
              <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-3xs">
                <div className="grid grid-cols-7 border-b border-zinc-150 bg-zinc-50/20 py-2.5">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="text-center text-[10px] uppercase font-mono tracking-widest text-zinc-450 font-extrabold">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 border-t border-l border-zinc-200/60 bg-white">
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
                          onDoubleClick={(e) => { e.stopPropagation(); handleOpenModalWithDate(dayDate); }}
                        className={`min-h-[115px] flex flex-col p-2.5 transition-all relative group border-r border-b border-zinc-200/60 ${
                          isDraggedOver 
                            ? 'bg-indigo-50/20 ring-2 ring-inset ring-indigo-500 z-10 scale-[1.01] shadow-md' 
                            : isToday
                            ? 'bg-indigo-50/10 ring-1 ring-inset ring-indigo-500/30'
                            : isCurrentMonth
                            ? 'bg-white hover:bg-zinc-50/30'
                            : 'bg-zinc-50/50 opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-extrabold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                            isToday 
                              ? 'bg-zinc-950 text-white shadow-3xs' 
                              : isCurrentMonth 
                                ? 'text-zinc-800 hover:bg-zinc-100' 
                                : 'text-zinc-400'
                          }`}>
                            {dayDate.getDate()}
                          </span>
                          {isWriteAllowed && (
                            <button
                              onClick={() => handleOpenModalWithDate(dayDate)}
                              className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-zinc-150/60 text-zinc-500 hover:text-zinc-900 rounded-lg cursor-pointer active:scale-90"
                              title="Add Dispatch"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[75px] pr-0.5 custom-scrollbar">
                          {dayScheds.map(sched => (
                            <button
                              key={sched.id}
                              onClick={() => setSelectedSchedule(sched)}
                              className={`text-[9px] font-extrabold py-1 px-2.5 rounded-lg border w-full text-left flex items-center justify-between transition-all hover:shadow-xs cursor-pointer ${
                                !isCurrentMonth ? 'opacity-60' : ''
                              } ${
                                !sched.technician
                                  ? 'bg-rose-50/60 border-rose-150/70 text-rose-900 hover:bg-rose-100/50 border-l-3 border-l-rose-500'
                                  : sched.is_vip_hook 
                                  ? 'bg-indigo-50/60 border-indigo-150/70 text-indigo-950 hover:bg-indigo-100/50 border-l-3 border-l-indigo-500' 
                                  : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100 border-l-3 border-l-zinc-500'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                                {sched.is_vip_hook && <Star className="w-2.5 h-2.5 text-indigo-600 fill-indigo-500 shrink-0" />}
                                <span className="truncate uppercase font-mono tracking-tight text-[9px]">{sched.client_name}</span>
                              </span>
                              <span className="text-[8px] opacity-75 font-extrabold uppercase truncate shrink-0 ml-1.5 max-w-[42px]">
                                {sched.technician ? sched.technician.full_name.split(' ')[0] : 'Open'}
                              </span>
                            </button>
                          ))}
                        </div>

                        {dayLeaves.length > 0 && (
                          <div className="mt-1 flex items-center justify-end">
                            <span 
                              className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded-md scale-90"
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
              <div className="p-6 bg-zinc-50/30 overflow-x-auto">
                <div className="flex gap-4 min-w-[1100px] h-[65vh]">
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
                          onDoubleClick={(e) => { e.stopPropagation(); handleOpenModalWithDate(dayDate); }}
                        className={`flex-1 min-w-[200px] flex flex-col border rounded-2xl overflow-hidden transition-all duration-200 bg-white ${
                          isDraggedOver 
                            ? 'border-indigo-500 bg-indigo-50/10 ring-2 ring-inset ring-indigo-500 scale-[1.01] shadow-md z-10' 
                            : isToday
                            ? 'border-zinc-350 shadow-2xs ring-1 ring-zinc-350/50'
                            : 'border-zinc-200 shadow-3xs hover:border-zinc-250'
                        }`}
                      >
                        <div className={`p-4 border-b flex flex-col justify-center items-center relative ${
                          isToday ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-zinc-50/50 border-zinc-100'
                        }`}>
                          <span className={`text-[9px] uppercase font-mono tracking-wider font-extrabold ${isToday ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            {weekdayName}
                          </span>
                          <span className={`text-lg font-extrabold mt-0.5 ${isToday ? 'text-white' : 'text-zinc-800'}`}>
                            {dayDate.getDate()}
                          </span>
                          {dayScheds.length > 0 && (
                            <span className={`absolute top-2.5 right-2.5 text-[8px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                              isToday ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-200/50 border-zinc-250 text-zinc-650'
                            }`}>
                              {dayScheds.length}
                            </span>
                          )}
                        </div>

                        {isWriteAllowed && (
                          <div className="p-3 border-b border-dashed border-zinc-200 bg-zinc-50/30 flex justify-center">
                            <button
                              onClick={() => handleOpenModalWithDate(dayDate)}
                              className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-zinc-850 bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200 shadow-3xs flex items-center gap-1 transition-all cursor-pointer hover:border-zinc-300 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" /> Dispatch
                            </button>
                          </div>
                        )}

                        <div className="p-3 flex-1 space-y-3 overflow-y-auto max-h-[50vh] custom-scrollbar bg-zinc-50/10">
                          {dayScheds.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                              <span className="text-[14px]">⛱️</span>
                              <p className="text-[9px] font-extrabold uppercase tracking-wider mt-1 text-center">No assignments</p>
                            </div>
                          ) : (
                            dayScheds.map(sched => (
                              <button
                                key={sched.id}
                                onClick={() => setSelectedSchedule(sched)}
                                className={`w-full p-3 rounded-xl border text-left flex flex-col transition-all hover:shadow-xs hover:border-zinc-350 cursor-pointer bg-white relative overflow-hidden ${
                                  !sched.technician
                                    ? 'border-l-4 border-l-rose-500 border-zinc-200'
                                    : sched.is_vip_hook 
                                    ? 'border-l-4 border-l-indigo-500 border-zinc-200' 
                                    : 'border-l-4 border-l-zinc-400 border-zinc-200'
                                }`}
                              >
                                {sched.is_vip_hook && (
                                  <span className="absolute top-2.5 right-2.5 bg-indigo-50 border border-indigo-150 p-0.5 rounded-full" title="VIP hook active">
                                    <Star className="w-2.5 h-2.5 text-indigo-600 fill-indigo-500" />
                                  </span>
                                )}

                                <span className="text-2xs font-extrabold text-zinc-900 tracking-tight leading-tight pr-6 uppercase block truncate">
                                  {sched.client_name}
                                </span>

                                <div className="mt-2 flex flex-col gap-1 text-[9px] font-bold text-zinc-400">
                                  <span className="flex items-center gap-1.5 truncate">
                                    <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                                    <span className="text-zinc-600 font-semibold">
                                      {new Date(sched.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </span>
                                  <span className="flex items-center gap-1.5 truncate">
                                    <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                                    <span className="text-zinc-650 font-semibold">{sched.location}</span>
                                  </span>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-zinc-150/60 flex items-center justify-between w-full">
                                  <div className="flex -space-x-1.5 overflow-hidden">
                                    {sched.technician && (
                                      <div 
                                        className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white bg-zinc-800 text-white text-[8px] font-extrabold flex items-center justify-center shadow-3xs"
                                        title={`${sched.technician.full_name} (${sched.technician.role})`}
                                      >
                                        {sched.technician.full_name.charAt(0)}
                                      </div>
                                    )}
                                    {sched.senior_partner && (
                                      <div 
                                        className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white bg-indigo-600 text-white text-[8px] font-extrabold flex items-center justify-center shadow-3xs"
                                        title={`${sched.senior_partner.full_name} (Senior Partner)`}
                                      >
                                        {sched.senior_partner.full_name.charAt(0)}
                                      </div>
                                    )}
                                    {!sched.technician && (
                                      <div 
                                        className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white bg-rose-100 text-rose-700 text-[8px] font-extrabold flex items-center justify-center shadow-3xs"
                                        title="Unassigned due to leave conflict"
                                      >
                                        ?
                                      </div>
                                    )}
                                  </div>
                                  
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                                    sched.attendance_mode === 'hq'
                                      ? 'bg-zinc-50 border-zinc-200 text-zinc-550'
                                      : sched.attendance_mode === 'direct_dispatch'
                                      ? 'bg-indigo-50 border-indigo-100/60 text-indigo-700'
                                      : 'bg-amber-50 border-amber-155 text-amber-755'
                                  }`}>
                                    {sched.attendance_mode === 'hq' ? 'HQ' : sched.attendance_mode === 'direct_dispatch' ? 'Direct' : 'Travel'}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>

                        {dayLeaves.length > 0 && (
                          <div className="p-2.5 bg-rose-50/50 border-t border-rose-100 text-[9px] text-rose-750 font-bold text-center">
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
                          ? "border-rose-150 bg-rose-50/10"
                          : sched.is_vip_hook 
                          ? "border-indigo-150 bg-indigo-50/10" 
                          : "border-zinc-200"
                      }`}
                    >
                      {sched.is_vip_hook && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-extrabold px-3 py-1.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-white" /> VIP Hook Active
                        </div>
                      )}
                      
                      {!sched.technician && (
                        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-rose-250 bg-rose-50/50 p-3.5 shadow-3xs">
                          <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-600" />
                          <div>
                            <p className="text-xs font-extrabold text-rose-950">Staff Unassigned — Reassignment Required</p>
                            <p className="mt-0.5 text-xs text-rose-800 font-medium">
                              The assigned employee has approved leave covering this dispatch period. Please assign another technician or helper.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-bold text-base ${sched.is_vip_hook ? "text-indigo-900 pr-32" : "text-zinc-800"}`}>
                            {sched.client_name}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${
                              sched.attendance_mode === 'hq' 
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-550'
                                : sched.attendance_mode === 'direct_dispatch'
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                                : 'bg-amber-50 border-amber-150 text-amber-755'
                            }`}>
                              DTR Mode: {sched.attendance_mode === 'hq' ? 'Pacita HQ' : sched.attendance_mode === 'direct_dispatch' ? 'Direct Dispatch' : 'Out of Town'}
                            </span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleToggleVip(sched.id, sched.is_vip_hook)}
                          disabled={isPending}
                          className={`text-2xs font-extrabold px-3 py-1.5 rounded-lg transition-all border cursor-pointer uppercase tracking-wider active:scale-95 ${
                            sched.is_vip_hook 
                              ? "bg-rose-50 text-rose-700 border-rose-150 hover:bg-rose-100/60" 
                              : "bg-indigo-50 text-indigo-700 border-indigo-150 hover:bg-indigo-100/60"
                          }`}
                        >
                          {sched.is_vip_hook ? "Remove VIP" : "Make VIP"}
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-2xs font-semibold text-zinc-550 my-4">
                        <div className="flex items-center gap-2 bg-zinc-50/60 px-3 py-1.5 rounded-xl border border-zinc-200/50 shadow-3xs">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" /> 
                          <span className="text-zinc-700">
                            {new Date(sched.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {sched.end_time ? ` - ${new Date(sched.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : " (Continuous / Clock-out required)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-50/60 px-3 py-1.5 rounded-xl border border-zinc-200/50 shadow-3xs">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" /> 
                          <span className="text-zinc-700">{sched.location}</span>
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
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col h-[78vh]">
            <h2 className="text-xs font-extrabold tracking-wider text-zinc-400 mb-3.5 flex items-center gap-2 uppercase font-mono border-b border-zinc-100 pb-2">
              <Users className="w-4 h-4 text-zinc-400" /> Field workforce
            </h2>

            <div className="relative mb-4">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter staff by name..."
                value={workforceQuery}
                onChange={(e) => setWorkforceQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl bg-white text-zinc-850 text-2xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-350 transition-all shadow-3xs placeholder:text-zinc-455"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
              {/* Technicians Section */}
              <div>
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2 flex items-center justify-between">
                  <span>Senior Technicians</span>
                  <span className="bg-zinc-100 text-zinc-655 px-1.5 py-0.2 rounded-full border border-zinc-200/60 font-mono text-[9px]">
                    {filteredStaff.filter(t => t.role !== 'helper').length}
                  </span>
                </h3>
                
                <div className="space-y-2">
                  {filteredStaff.filter(t => t.role !== 'helper').length === 0 ? (
                    <p className="text-[10px] text-zinc-400 italic py-1 pl-1">No technicians found</p>
                  ) : (
                    filteredStaff.filter(t => t.role !== 'helper').map((tech) => {
                      const status = getTechStatusToday(tech.id)
                      const statusLight = status.label === "Available" 
                        ? "bg-emerald-500 shadow-emerald-500/20" 
                        : status.label === "Dispatched" 
                        ? "bg-amber-500 shadow-amber-500/20" 
                        : "bg-rose-500 shadow-rose-500/20"

                      return (
                        <div 
                          key={tech.id}
                          draggable={isWriteAllowed}
                          onDragStart={isWriteAllowed ? (e) => handleDragStart(e, 'technician', { id: tech.id, name: tech.full_name }) : undefined}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                            isWriteAllowed 
                              ? 'bg-zinc-50 border-zinc-200/80 hover:border-zinc-350 hover:bg-white hover:shadow-3xs cursor-grab active:cursor-grabbing select-none' 
                              : 'bg-zinc-50 border-zinc-200 opacity-90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isWriteAllowed && (
                              <GripVertical className="w-3.5 h-3.5 text-zinc-400 shrink-0 cursor-grab active:cursor-grabbing -ml-1 mr-0.5" />
                            )}
                            <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 border border-zinc-250/30 flex items-center justify-center text-zinc-700 font-bold text-[11px] shadow-3xs shrink-0">
                              {tech.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-zinc-900 text-xs truncate leading-snug">{tech.full_name}</p>
                              <p className="text-[9px] text-zinc-450 font-semibold truncate leading-none mt-0.5">{tech.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-sm ${statusLight}`} />
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{status.label}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Helpers Section */}
              <div>
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2 flex items-center justify-between">
                  <span>Helpers & Apprentices</span>
                  <span className="bg-zinc-100 text-zinc-655 px-1.5 py-0.2 rounded-full border border-zinc-200/60 font-mono text-[9px]">
                    {filteredStaff.filter(t => t.role === 'helper').length}
                  </span>
                </h3>
                
                <div className="space-y-2">
                  {filteredStaff.filter(t => t.role === 'helper').length === 0 ? (
                    <p className="text-[10px] text-zinc-400 italic py-1 pl-1">No helpers found</p>
                  ) : (
                    filteredStaff.filter(t => t.role === 'helper').map((tech) => {
                      const status = getTechStatusToday(tech.id)
                      const statusLight = status.label === "Available" 
                        ? "bg-emerald-500 shadow-emerald-500/20" 
                        : status.label === "Dispatched" 
                        ? "bg-amber-500 shadow-amber-500/20" 
                        : "bg-rose-500 shadow-rose-500/20"

                      return (
                        <div 
                          key={tech.id}
                          draggable={isWriteAllowed}
                          onDragStart={isWriteAllowed ? (e) => handleDragStart(e, 'technician', { id: tech.id, name: tech.full_name }) : undefined}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                            isWriteAllowed 
                              ? 'bg-zinc-50 border-zinc-200/80 hover:border-zinc-350 hover:bg-white hover:shadow-3xs cursor-grab active:cursor-grabbing select-none' 
                              : 'bg-zinc-50 border-zinc-200 opacity-90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isWriteAllowed && (
                              <GripVertical className="w-3.5 h-3.5 text-zinc-400 shrink-0 cursor-grab active:cursor-grabbing -ml-1 mr-0.5" />
                            )}
                            <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 border border-zinc-250/30 flex items-center justify-center text-zinc-700 font-bold text-[11px] shadow-3xs shrink-0">
                              {tech.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-zinc-900 text-xs truncate leading-snug">{tech.full_name}</p>
                              <p className="text-[9px] text-zinc-450 font-semibold truncate leading-none mt-0.5">{tech.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-sm ${statusLight}`} />
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{status.label}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
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
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex flex-col gap-3">
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
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditSchedule(selectedSchedule)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-sm cursor-pointer"
                  >
                    Edit Schedule
                  </button>
                  <button 
                    onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-sm cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <div className="relative bg-white max-h-[90vh] w-full max-w-xl shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-150 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-950">Dispatch Assignment</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Deploy technicians or helper pairings to site itineraries.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-zinc-150 px-6 bg-white shrink-0">
              <button 
                type="button"
                disabled={attendanceMode === 'out_of_town'}
                onClick={() => {
                  setScheduleType('single')
                  setErrorMsg("")
                  setSuccessMsg("")
                }}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors flex items-center gap-2 cursor-pointer ${
                  attendanceMode === 'out_of_town' ? 'opacity-40 cursor-not-allowed' : ''
                } ${
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
                <div className="p-4 bg-rose-50/60 border border-rose-100 text-rose-900 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in shadow-3xs">
                  <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-extrabold text-rose-950">Dispatch Failed</p>
                    <p className="mt-0.5 text-rose-800 font-medium">{errorMsg}</p>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200/60 text-emerald-900 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in shadow-3xs">
                  <Check className="w-4.5 h-4.5 mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-extrabold text-emerald-950">Dispatch Scheduled</p>
                    <p className="mt-0.5 text-emerald-800 font-medium">{successMsg}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-900 mb-3 border-b border-zinc-100 pb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Itinerary & Location Details
                </h3>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Client Name / Job Title</label>
                  <input required type="text" value={clientName} onChange={(e) => setDestinations(prev => { const newD = [...prev]; newD[0].clientName = e.target.value; return newD; })} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-zinc-50/50 hover:bg-zinc-50/20 text-zinc-900 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all placeholder:text-zinc-400 placeholder:font-medium" placeholder="e.g. Pacita Mall Aircon Cleaning" />
                </div>
                <MapAutocomplete
                  location={destinations[0]?.location || ""}
                  setLocation={(loc) => setDestinations(prev => { const n = [...prev]; n[0].location = loc; return n; })}
                  lat={destinations[0]?.geofenceLat || null}
                  setLat={(lat) => setDestinations(prev => { const n = [...prev]; n[0].geofenceLat = lat; return n; })}
                  lng={destinations[0]?.geofenceLng || null}
                  setLng={(lng) => setDestinations(prev => { const n = [...prev]; n[0].geofenceLng = lng; return n; })}
                  radius={destinations[0]?.geofenceRadius || 500}
                  setRadius={(radius) => setDestinations(prev => { const n = [...prev]; n[0].geofenceRadius = radius; return n; })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Start Time</label>
                    <input required type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-zinc-50/50 hover:bg-zinc-50/20 text-zinc-900 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Attendance Tracking Mode</label>
                    <select 
                      value={attendanceMode} 
                      onChange={(e) => {
                        const val = e.target.value
                        setAttendanceMode(val)
                        if (val === 'direct_dispatch') {
                          setAllowanceRate(200)
                        } else if (val === 'out_of_town') {
                          setAllowanceRate(500)
                          setScheduleType('bulk') // Force Bulk Team tab
                        }
                      }} 
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-zinc-50/50 hover:bg-zinc-50/20 text-zinc-900 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all cursor-pointer"
                    >
                      <option value="direct_dispatch">On-Site Direct Dispatch (No Bio)</option>
                      <option value="out_of_town">Out-of-Town Mode (Continuous)</option>
                    </select>
                  </div>
                </div>
                {attendanceMode === 'direct_dispatch' && (
                  <div className="animate-in fade-in slide-in-from-top duration-200">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Allowance Rate (₱ / day)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={allowanceRate} 
                      onChange={(e) => setAllowanceRate(parseFloat(e.target.value) || 0)} 
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-zinc-50/50 hover:bg-zinc-50/20 text-zinc-900 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all" 
                      placeholder="e.g. 200"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 p-3.5 bg-indigo-50/40 border border-indigo-100/50 rounded-xl hover:bg-indigo-50/60 transition-all">
                  <input type="checkbox" id="isVip" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} className="w-4.5 h-4.5 rounded border-indigo-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer" />
                  <label htmlFor="isVip" className="text-xs font-bold text-indigo-950 cursor-pointer select-none">Flag as VIP Hook (High Priority Dispatch)</label>
                </div>

                {/* Geofence Verification Configuration */}
                <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-4 shadow-3xs">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                    <span className="text-xs font-extrabold text-zinc-900 flex items-center gap-1.5 uppercase tracking-wider">
                      📍 Geofence Verification (Optional)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="e.g. 14.5995"
                        value={destinations[0]?.geofenceLat ?? ""} 
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : null;
                          setDestinations(prev => {
                            const newD = [...prev];
                            newD[0].geofenceLat = val;
                            return newD;
                          });
                        }} 
                        className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="e.g. 120.9842"
                        value={destinations[0]?.geofenceLng ?? ""} 
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : null;
                          setDestinations(prev => {
                            const newD = [...prev];
                            newD[0].geofenceLng = val;
                            return newD;
                          });
                        }} 
                        className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Geofence Radius</label>
                    <select 
                      value={destinations[0]?.geofenceRadius ?? 100} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setDestinations(prev => {
                          const newD = [...prev];
                          newD[0].geofenceRadius = val;
                          return newD;
                        });
                      }} 
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all cursor-pointer"
                    >
                      <option value={50}>50 meters</option>
                      <option value={100}>100 meters (Recommended)</option>
                      <option value={250}>250 meters</option>
                      <option value={500}>500 meters</option>
                      <option value={1000}>1000 meters</option>
                    </select>
                    <p className="text-[10px] text-zinc-450 mt-2 leading-normal font-semibold">
                      ℹ️ How to get coordinates: Right-click any location on Google Maps, then click the latitude/longitude numbers to copy them.
                    </p>
                  </div>
                </div>
              </div>

              {scheduleType === 'single' && (
                <form onSubmit={handleCreateSingle} className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-900 mb-3 border-b border-zinc-100 pb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" /> Staff & Pairing Configuration
                  </h3>
                  
                  {/* Custom Deploy Employee Dropdown */}
                  <div className="relative">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Deploy Employee</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsTechDropdownOpen(!isTechDropdownOpen)
                        setIsPartnerDropdownOpen(false)
                      }} 
                      className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50/50 hover:bg-zinc-50/20 text-zinc-900 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all flex items-center justify-between cursor-pointer"
                    >
                      {selectedTech ? (
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${selectedTech.role === 'helper' ? 'bg-teal-500' : 'bg-indigo-500'}`} />
                          <span>{selectedTech.full_name} ({selectedTech.role})</span>
                        </span>
                      ) : (
                        <span className="text-zinc-450">Select Employee...</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    </button>

                    {isTechDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 p-3 space-y-2.5 animate-in fade-in duration-100">
                        {/* Search */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-450 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text" 
                            placeholder="Search employee..." 
                            value={techSearch} 
                            onChange={(e) => { setTechSearch(e.target.value); setTechPage(1) }} 
                            className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 rounded-lg bg-zinc-50/30 text-2xs focus:outline-none focus:border-zinc-300 font-medium"
                          />
                        </div>

                        {/* Filter buttons */}
                        <div className="flex gap-1">
                          {['all', 'technician', 'helper'].map((role) => (
                            <button 
                              key={role} 
                              type="button" 
                              onClick={() => { setTechRoleFilter(role as any); setTechPage(1) }} 
                              className={`px-2 py-1 text-[9px] font-extrabold rounded-md uppercase tracking-wider border cursor-pointer transition-all ${
                                techRoleFilter === role 
                                  ? 'bg-zinc-900 text-white border-zinc-900' 
                                  : 'bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100'
                              }`}
                            >
                              {role}s
                            </button>
                          ))}
                        </div>

                        {/* List of items */}
                        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                          {paginatedSingleTechs.length === 0 ? (
                            <p className="text-[10px] text-zinc-400 italic text-center py-3">No staff found</p>
                          ) : (
                            paginatedSingleTechs.map((t) => {
                              const isSelected = techId === t.id
                              const hasConflict = approvedLeaves.some(leave => {
                                if (leave.technician_id !== t.id) return false
                                const { start, end } = getLeaveRangeMs(leave.start_date, leave.end_date)
                                const schedMs = new Date(startTime).getTime()
                                return schedMs >= start && schedMs <= end
                              })

                              return (
                                <button 
                                  key={t.id} 
                                  type="button" 
                                  onClick={() => {
                                    setTechId(t.id)
                                    setSeniorPartnerId("")
                                    setIsTechDropdownOpen(false)
                                  }}
                                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all text-xs font-semibold cursor-pointer ${
                                    isSelected 
                                      ? 'bg-zinc-50 border-zinc-900 text-zinc-900' 
                                      : 'bg-white border-zinc-150 text-zinc-750 hover:bg-zinc-50'
                                  }`}
                                >
                                  <span className="truncate">
                                    {t.full_name} ({t.role}){' '}
                                    {hasConflict && (
                                      <span className={isVip ? "text-indigo-650 font-extrabold" : "text-rose-600 font-bold"}>
                                        ⚠️ {isVip ? '(Bypass)' : '(Leave)'}
                                      </span>
                                    )}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900" />}
                                </button>
                              )
                            })
                          )}
                        </div>

                        {/* Pagination controls */}
                        {singleTechsTotalPages > 1 && (
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[10px]">
                            <button 
                              type="button" 
                              disabled={techPage === 1} 
                              onClick={() => setTechPage(p => Math.max(1, p - 1))} 
                              className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-50 font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Prev
                            </button>
                            <span className="text-zinc-550 font-mono">Page {techPage} of {singleTechsTotalPages}</span>
                            <button 
                              type="button" 
                              disabled={techPage === singleTechsTotalPages} 
                              onClick={() => setTechPage(p => Math.min(singleTechsTotalPages, p + 1))} 
                              className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-50 font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custom Senior Partner Dropdown */}
                  {selectedStaffHasHelper && (
                    <div className="relative animate-in fade-in slide-in-from-top duration-200">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Assign Senior Technician Partner</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsPartnerDropdownOpen(!isPartnerDropdownOpen)
                          setIsTechDropdownOpen(false)
                        }} 
                        className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50/50 hover:bg-zinc-50/20 text-zinc-900 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all flex items-center justify-between cursor-pointer"
                      >
                        {selectedPartner ? (
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                            <span>{selectedPartner.full_name} (Technician)</span>
                          </span>
                        ) : (
                          <span className="text-zinc-450 italic">No Senior Partner (Independent Helper)</span>
                        )}
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      </button>

                      {isPartnerDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 p-3 space-y-2.5 animate-in fade-in duration-100">
                          {/* Search */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-zinc-455 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input 
                              type="text" 
                              placeholder="Search technician..." 
                              value={partnerSearch} 
                              onChange={(e) => { setPartnerSearch(e.target.value); setPartnerPage(1) }} 
                              className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 rounded-lg bg-zinc-50/30 text-2xs focus:outline-none focus:border-zinc-300 font-medium"
                            />
                          </div>

                          {/* List of items */}
                          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                            <button 
                              type="button" 
                              onClick={() => {
                                setSeniorPartnerId("")
                                setIsPartnerDropdownOpen(false)
                              }}
                              className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all text-xs font-semibold cursor-pointer ${
                                seniorPartnerId === "" 
                                  ? 'bg-zinc-50 border-zinc-900 text-zinc-900' 
                                  : 'bg-white border-zinc-150 text-zinc-500 hover:bg-zinc-50 italic'
                              }`}
                            >
                              <span>No Senior Partner (Independent Helper)</span>
                              {seniorPartnerId === "" && <Check className="w-3.5 h-3.5 text-zinc-900" />}
                            </button>

                            {paginatedPartners.length === 0 ? (
                              <p className="text-[10px] text-zinc-400 italic text-center py-3">No senior partners found</p>
                            ) : (
                              paginatedPartners.map((t) => {
                                const isSelected = seniorPartnerId === t.id
                                return (
                                  <button 
                                    key={t.id} 
                                    type="button" 
                                    onClick={() => {
                                      setSeniorPartnerId(t.id)
                                      setIsPartnerDropdownOpen(false)
                                    }}
                                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all text-xs font-semibold cursor-pointer ${
                                      isSelected 
                                        ? 'bg-zinc-50 border-zinc-900 text-zinc-900' 
                                        : 'bg-white border-zinc-150 text-zinc-700 hover:bg-zinc-50'
                                    }`}
                                  >
                                    <span className="truncate">{t.full_name}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900" />}
                                  </button>
                                )
                              })
                            )}
                          </div>

                          {/* Pagination controls */}
                          {partnerTotalPages > 1 && (
                            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[10px]">
                              <button 
                                type="button" 
                                disabled={partnerPage === 1} 
                                onClick={() => setPartnerPage(p => Math.max(1, p - 1))} 
                                className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-50 font-bold uppercase tracking-wider cursor-pointer"
                              >
                                Prev
                              </button>
                              <span className="text-zinc-550 font-mono">Page {partnerPage} of {partnerTotalPages}</span>
                              <button 
                                type="button" 
                                disabled={partnerPage === partnerTotalPages} 
                                onClick={() => setPartnerPage(p => Math.min(partnerTotalPages, p + 1))} 
                                className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-50 font-bold uppercase tracking-wider cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {currentConflict && (
                    <div className={`p-3.5 border rounded-xl text-2xs font-bold leading-normal flex items-start gap-2.5 animate-in fade-in shadow-3xs ${
                      isVip 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                        : 'bg-rose-50 border-rose-250 text-rose-800'
                    }`}>
                      <AlertCircle className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${isVip ? 'text-indigo-600' : 'text-rose-600'}`} />
                      <div>
                        <p className="font-extrabold">{isVip ? 'VIP Override Active' : 'Leave Conflict Detected'}</p>
                        <p className="font-medium mt-0.5">
                          {isVip 
                            ? 'The selected worker is on leave, but VIP Priority status is active. Saving this dispatch will force the assignment.' 
                            : 'The selected worker is on approved leave during this time. Please adjust schedule, change worker, or check VIP Hook to override.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={isPending || (!!currentConflict && !isVip) || destinations.some(d => !d.clientName.trim() || !d.location.trim()) || !startTime} className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 text-white py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Dispatch Schedule"}
                  </button>
                </form>
              )}

              {scheduleType === 'bulk' && (
                <form onSubmit={handleCreateBulk} className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-900 mb-3 border-b border-zinc-100 pb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" /> Team Selection & Pairings
                  </h3>
                  
                  {!startTime && (
                    <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs font-bold text-blue-700 mb-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
                      <span>Select a Start Date &amp; Time above to see staff availability.</span>
                    </div>
                  )}

                  {/* Search inside Bulk Selection */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-zinc-450 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search team staff..." 
                      value={bulkSearch} 
                      onChange={(e) => { setBulkSearch(e.target.value); setBulkPage(1) }} 
                      className="w-full pl-8 pr-3 py-2 border border-zinc-200 rounded-xl bg-zinc-50/50 text-2xs focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all placeholder:text-zinc-400 font-medium"
                    />
                  </div>

                  {/* Filter buttons inside Bulk Selection */}
                  <div className="flex gap-1 mb-3">
                    {['all', 'technician', 'helper'].map((role) => (
                      <button 
                        key={role} 
                        type="button" 
                        onClick={() => { setBulkRoleFilter(role as any); setBulkPage(1) }} 
                        className={`px-2 py-1 text-[9px] font-extrabold rounded-md uppercase tracking-wider border cursor-pointer transition-all ${
                          bulkRoleFilter === role 
                            ? 'bg-zinc-900 text-white border-zinc-900' 
                            : 'bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {role}s
                      </button>
                    ))}
                  </div>

                  {/* Paginated list of checkboxes */}
                  <div className="space-y-2 border border-zinc-200 rounded-xl p-3 bg-zinc-50/30">
                    {paginatedBulkStaff.length === 0 ? (
                      <p className="text-2xs text-zinc-400 italic text-center py-4">No employees matching search</p>
                    ) : (
                      paginatedBulkStaff.map((t) => {
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
                              !startTime ? 'opacity-40 cursor-not-allowed' : (hasConflict && !isVip) ? 'opacity-60 bg-amber-50/20 cursor-not-allowed' : 'hover:bg-zinc-50 cursor-pointer'
                            }`}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                disabled={!startTime || (hasConflict && !isVip)}
                                onChange={() => toggleStaffSelection(t.id)} 
                                className="w-4.5 h-4.5 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900 cursor-pointer" 
                              />
                              <span className="text-xs font-semibold text-zinc-700">
                                {t.full_name} ({t.role}){' '}
                                {hasConflict && (
                                  <span className={isVip ? "text-indigo-650 font-extrabold" : "text-rose-650 font-bold"}>
                                    ⚠️ {isVip ? "(Leave - VIP Override Active)" : "(On Leave)"}
                                  </span>
                                )}
                              </span>
                            </label>
                            {isChecked && t.role === 'helper' && (
                              <div className="ml-7">
                                <select value={bulkSeniorPartnerMap[t.id] || ""} onChange={(e) => setBulkSeniorPartnerMap(prev => ({ ...prev, [t.id]: e.target.value }))} className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-zinc-50/50 hover:bg-zinc-50/20 text-zinc-900 text-2xs focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-300 outline-none cursor-pointer">
                                  <option value="">No Senior Partner (Independent Helper)</option>
                                  {techniciansOnly.map(tech => <option key={tech.id} value={tech.id}>{tech.full_name}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Bulk list pagination controls */}
                  {bulkStaffTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 text-[10px]">
                      <button 
                        type="button" 
                        disabled={bulkPage === 1} 
                        onClick={() => setBulkPage(p => Math.max(1, p - 1))} 
                        className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-50 font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="text-zinc-500 font-mono">Page {bulkPage} of {bulkStaffTotalPages}</span>
                      <button 
                        type="button" 
                        disabled={bulkPage === bulkStaffTotalPages} 
                        onClick={() => setBulkPage(p => Math.min(bulkStaffTotalPages, p + 1))} 
                        className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-50 font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}

                  <button type="submit" disabled={isPending || selectedStaffIds.length === 0 || destinations.some(d => !d.clientName.trim() || !d.location.trim()) || !startTime} className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 text-white py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Dispatch Selected Team (${selectedStaffIds.length})`}
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
