"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  UserPlus, 
  Briefcase, 
  Mail, 
  KeyRound, 
  Loader2, 
  CheckCircle2, 
  Trash2, 
  Calendar, 
  ShieldAlert, 
  X, 
  Check, 
  FileText, 
  Clock, 
  AlertCircle, 
  Plus, 
  ChevronRight, 
  UserCheck,
  History,
  Users
} from "lucide-react"
import { 
  deleteTechnician, 
  TechnicianInfo, 
  update201Checklist, 
  getPotentialManagers, 
  getEmployeeTimeLogs, 
  addManualDtrLog,
  ChecklistData,
  bulkRegisterEmployees,
  getDtrOverrideHistories,
  overrideDtrLog
} from "@/app/actions/employees"
import { createClient } from "@/lib/supabase/client"
import { logActivity } from "@/app/actions/activity"

interface EmployeesClientProps {
  initialTechnicians: TechnicianInfo[]
  officeLocations: any[]
  activeTechnicianIds?: string[]
}

export default function EmployeesClient({ initialTechnicians, officeLocations, activeTechnicianIds = [] }: EmployeesClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)



  // Current logged in admin role
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [potentialManagers, setPotentialManagers] = useState<any[]>([])

  // Drawer / Selection states
  const [selectedEmployee, setSelectedEmployee] = useState<TechnicianInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'overrides'>('profile')
  const [overrideLogs, setOverrideLogs] = useState<any[]>([])
  const [loadingOverrides, setLoadingOverrides] = useState(false)
  const [manualJustification, setManualJustification] = useState('')
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editClockIn, setEditClockIn] = useState('')
  const [editClockOut, setEditClockOut] = useState('')
  const [editJustification, setEditJustification] = useState('')
  const [loadingAction, setLoadingAction] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' })

  // 201 Checklist States
  const [status, setStatus] = useState('ojt')
  const [managerId, setManagerId] = useState<string>('')
  const [hireDate, setHireDate] = useState('')
  const [sss, setSss] = useState(false)
  const [philhealth, setPhilhealth] = useState(false)
  const [pagibig, setPagibig] = useState(false)
  const [nbi, setNbi] = useState(false)
  const [resume, setResume] = useState(false)
  const [medical, setMedical] = useState(false)
  const [drawerLifecycleStatus, setDrawerLifecycleStatus] = useState('active')
  const [drawerBranchId, setDrawerBranchId] = useState<string>('')

  // Attendance states
  const [timeLogs, setTimeLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [manualClockIn, setManualClockIn] = useState('')
  const [manualClockOut, setManualClockOut] = useState('')

  // Filter and registration states
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'off_duty' | 'on_leave'>('all')
  const [roleInput, setRoleInput] = useState("technician")
  const [baseSalaryInput, setBaseSalaryInput] = useState("20000")

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Bulk Import States
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false)
  const [bulkCsvData, setBulkCsvData] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState<{
    successCount: number
    failureCount: number
    results: any[]
  } | null>(null)

  const filteredEmployees = initialTechnicians.filter(tech => {
    const isActive = activeTechnicianIds.includes(tech.id)
    const isOnLeave = tech.lifecycleStatus === 'on_leave'
    
    if (statusFilter === 'active') return isActive
    if (statusFilter === 'on_leave') return isOnLeave
    if (statusFilter === 'off_duty') return !isActive && !isOnLeave
    return true
  })

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const totalItems = filteredEmployees.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage)

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setBulkLoading(true)
    setBulkResults(null)
    setError("")

    try {
      const lines = bulkCsvData.split('\n')
      const parsedData = []
      for (const line of lines) {
        const rowText = line.trim()
        if (!rowText) continue
        const [fullName, email, role, baseSalary, branchName] = rowText.split(',').map(s => s.trim())
        parsedData.push({
          fullName,
          email,
          role: role?.toLowerCase(),
          baseSalary: Number(baseSalary),
          branchName: branchName || null
        })
      }

      if (parsedData.length === 0) {
        throw new Error("No data parsed from text area. Please check your CSV format.")
      }

      const res = await bulkRegisterEmployees(parsedData)
      if (res.error) {
        throw new Error(res.error)
      } else {
        setBulkResults({
          successCount: res.successCount || 0,
          failureCount: res.failureCount || 0,
          results: res.results || []
        })
        setBulkCsvData("")
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || "Failed to process bulk import.")
    } finally {
      setBulkLoading(false)
    }
  }

  // Load current user role and potential managers
  useEffect(() => {
    async function initData() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          if (profile) {
            setCurrentUserRole(profile.role)
          }
        }
        const managersList = await getPotentialManagers()
        setPotentialManagers(managersList || [])
      } catch (err) {
        console.error("Error initializing EmployeesClient data:", err)
      }
    }
    initData()
  }, [])

  const handleCreateTechnician = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    const form = e.currentTarget
    const formData = new FormData(form)
    const data = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
      baseSalary: Number(formData.get("baseSalary")),
      role: formData.get("role") || "technician"
    }

    try {
      const res = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error)
      
      // Log activity
      await logActivity('register_employee', 'employee', `Registered employee "${data.fullName}" (${data.role})`)

      setSuccess(true)
      form.reset()
      setRoleInput("technician")
      setBaseSalaryInput("20000")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening drawer
    setDeleting(true)
    try {
      const res = await deleteTechnician(id)
      if (res.error) {
        alert(res.error)
      } else {
        if (selectedEmployee?.id === id) {
          setSelectedEmployee(null)
        }
        router.refresh()
      }
    } catch (err: any) {
      alert("Failed to delete technician: " + err.message)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleOpenDrawer = (employee: TechnicianInfo) => {
    setSelectedEmployee(employee)
    setActiveTab('profile')
    setFeedbackMsg({ type: '', text: '' })
    
    // Set 201 states
    setStatus(employee.employmentStatus || 'ojt')
    setManagerId(employee.managerId || '')
    setHireDate(employee.hireDate ? new Date(employee.hireDate).toISOString().substring(0, 10) : '')
    setSss(!!employee.hasSssId)
    setNbi(!!employee.hasNbiClearance)
    setPhilhealth(!!employee.hasPhilhealthId)
    setPagibig(!!employee.hasPagibigId)
    setMedical(!!employee.hasMedicalClearance)
    setResume(!!employee.hasResume)
    setDrawerLifecycleStatus(employee.lifecycleStatus || 'active')
    setDrawerBranchId(employee.branchId || '')
    
    // Reset manual DTR states
    setManualClockIn('')
    setManualClockOut('')
    setManualJustification('')
    setTimeLogs([])
    setOverrideLogs([])
    setEditingLogId(null)
    setEditClockIn('')
    setEditClockOut('')
    setEditJustification('')
  }

  const loadEmployeeLogs = async (employeeId: string) => {
    setLoadingLogs(true)
    const logs = await getEmployeeTimeLogs(employeeId)
    setTimeLogs(logs)
    setLoadingLogs(false)
  }

  const loadOverrideLogs = async (employeeId: string) => {
    setLoadingOverrides(true)
    const logs = await getDtrOverrideHistories(employeeId)
    setOverrideLogs(logs)
    setLoadingOverrides(false)
  }

  const handleSave201 = async () => {
    if (!selectedEmployee) return
    setLoadingAction(true)
    setFeedbackMsg({ type: '', text: '' })
    
    const checklistData: ChecklistData = {
      hasSssId: sss,
      hasPhilhealthId: philhealth,
      hasPagibigId: pagibig,
      hasNbiClearance: nbi,
      hasResume: resume,
      hasMedicalClearance: medical,
      employmentStatus: status,
      managerId: managerId || null,
      hireDate: hireDate ? new Date(hireDate).toISOString() : null,
      branchId: drawerBranchId || null,
      lifecycleStatus: drawerLifecycleStatus
    }
    
    try {
      const res = await update201Checklist(selectedEmployee.id, checklistData)
      if (res.error) {
        setFeedbackMsg({ type: 'error', text: res.error })
      } else {
        setFeedbackMsg({ type: 'success', text: 'Employee 201 Checklist saved successfully!' })
        // Refresh matching employee object in list locally for direct response
        setSelectedEmployee({
          ...selectedEmployee,
          employmentStatus: status,
          managerId: managerId || null,
          hireDate: hireDate || null,
          hasSssId: sss,
          hasPhilhealthId: philhealth,
          hasPagibigId: pagibig,
          hasNbiClearance: nbi,
          hasResume: resume,
          hasMedicalClearance: medical,
          branchId: drawerBranchId || null,
          lifecycleStatus: drawerLifecycleStatus
        })
        router.refresh()
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'An error occurred' })
    } finally {
      setLoadingAction(false)
    }
  }

  const handleAddManualLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return
    setLoadingAction(true)
    setFeedbackMsg({ type: '', text: '' })
    
    try {
      const res = await addManualDtrLog(selectedEmployee.id, manualClockIn, manualClockOut, manualJustification)
      if (res.error) {
        setFeedbackMsg({ type: 'error', text: res.error })
      } else {
        setFeedbackMsg({ type: 'success', text: 'Manual DTR entry logged successfully!' })
        loadEmployeeLogs(selectedEmployee.id)
        setManualClockIn('')
        setManualClockOut('')
        setManualJustification('')
        router.refresh()
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'An error occurred' })
    } finally {
      setLoadingAction(false)
    }
  }

  const handleOverrideLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee || !editingLogId) return
    setLoadingAction(true)
    setFeedbackMsg({ type: '', text: '' })
    
    try {
      const res = await overrideDtrLog(selectedEmployee.id, editingLogId, editClockIn, editClockOut, editJustification)
      if (res.error) {
        setFeedbackMsg({ type: 'error', text: res.error })
      } else {
        setFeedbackMsg({ type: 'success', text: 'DTR log overrode successfully!' })
        loadEmployeeLogs(selectedEmployee.id)
        if (activeTab === 'overrides') {
          loadOverrideLogs(selectedEmployee.id)
        }
        setEditingLogId(null)
        setEditClockIn('')
        setEditClockOut('')
        setEditJustification('')
        router.refresh()
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'An error occurred' })
    } finally {
      setLoadingAction(false)
    }
  }

  const formatPhp = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // 201 Checklist editing permission
  const canEdit201 = ['super_admin', 'admin', 'ceo', 'coo', 'hr'].includes(currentUserRole)
  // DTR manual overriding permission
  const canOverrideDtr = ['super_admin', 'admin', 'ceo', 'coo', 'svp', 'branch_manager', 'supervisor', 'coordinator'].includes(currentUserRole)

  // Real-time status counts
  const activeNowCount = initialTechnicians.filter(t => activeTechnicianIds.includes(t.id)).length
  const onLeaveCount = initialTechnicians.filter(t => t.lifecycleStatus === 'on_leave').length
  const offDutyCount = Math.max(0, initialTechnicians.length - activeNowCount - onLeaveCount)

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto relative">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Manage Employees</h1>
          <p className="text-zinc-500 mt-1">Configure status, manager relationships, 201 files, and manual DTR cards.</p>
        </div>
        <button 
          onClick={() => {
            setIsBulkDrawerOpen(true)
            setBulkResults(null)
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer w-fit active:scale-98"
        >
          <UserPlus className="w-4 h-4" /> Bulk CSV Import
        </button>
      </div>

      {/* Real-time Employee Status Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-2xl border shadow-xs cursor-pointer transition-all hover:scale-[1.01] ${
            statusFilter === 'all' ? 'bg-white border-zinc-450 ring-2 ring-zinc-100 font-bold' : 'bg-white border-zinc-200 opacity-80'
          }`}
        >
          <p className="text-2xs font-extrabold uppercase tracking-wider text-zinc-400">Total Force</p>
          <p className="text-3xl font-extrabold text-zinc-900 mt-2">{initialTechnicians.length}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-2xs text-zinc-500 font-semibold">Registered staff</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('active')}
          className={`p-5 rounded-2xl border shadow-xs cursor-pointer transition-all hover:scale-[1.01] ${
            statusFilter === 'active' ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-100 font-bold' : 'bg-emerald-50/20 border-emerald-100 opacity-80'
          }`}
        >
          <p className="text-2xs font-extrabold uppercase tracking-wider text-emerald-600/80">Active Now</p>
          <p className="text-3xl font-extrabold text-emerald-800 mt-2">{activeNowCount}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-2xs text-emerald-600 font-semibold">Currently clocked in</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('off_duty')}
          className={`p-5 rounded-2xl border shadow-xs cursor-pointer transition-all hover:scale-[1.01] ${
            statusFilter === 'off_duty' ? 'bg-zinc-100 border-zinc-450 ring-2 ring-zinc-100 font-bold' : 'bg-zinc-50/50 border-zinc-200 opacity-80'
          }`}
        >
          <p className="text-2xs font-extrabold uppercase tracking-wider text-zinc-500">Off Duty</p>
          <p className="text-3xl font-extrabold text-zinc-800 mt-2">{offDutyCount}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="text-2xs text-zinc-500 font-semibold">Inactive or off-shift</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('on_leave')}
          className={`p-5 rounded-2xl border shadow-xs cursor-pointer transition-all hover:scale-[1.01] ${
            statusFilter === 'on_leave' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-100 font-bold' : 'bg-amber-50/20 border-amber-100 opacity-80'
          }`}
        >
          <p className="text-2xs font-extrabold uppercase tracking-wider text-amber-700">On Leave</p>
          <p className="text-3xl font-extrabold text-amber-800 mt-2">{onLeaveCount}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-2xs text-amber-600 font-semibold">Rest/sick/leave status</span>
          </div>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Registered Technicians List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" /> Employees Directory ({filteredEmployees.length})
              </h2>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="p-12 text-center">
                <UserPlus className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600 font-semibold">No matching employees found</p>
                <p className="text-sm text-zinc-400 mt-1">Try changing status filters or create an account.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-zinc-100">
                {paginatedEmployees.map((tech) => {
                  const sssVal = tech.hasSssId ? 1 : 0
                  const philVal = tech.hasPhilhealthId ? 1 : 0
                  const pagVal = tech.hasPagibigId ? 1 : 0
                  const nbiVal = tech.hasNbiClearance ? 1 : 0
                  const resVal = tech.hasResume ? 1 : 0
                  const medVal = tech.hasMedicalClearance ? 1 : 0
                  const complianceCount = sssVal + philVal + pagVal + nbiVal + resVal + medVal
                  const compliancePercent = Math.round((complianceCount / 6) * 100)

                  const statusColors = {
                    ojt: 'bg-amber-50 text-amber-700 border-amber-200',
                    contractual: 'bg-blue-50 text-blue-700 border-blue-200',
                    provisionary: 'bg-purple-50 text-purple-700 border-purple-200',
                    regular: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  }
                  const statusLabel = tech.employmentStatus || 'ojt'
                  const badgeClass = statusColors[statusLabel as keyof typeof statusColors] || 'bg-zinc-50 text-zinc-700 border-zinc-200'

                  return (
                    <div 
                      key={tech.id} 
                      onClick={() => handleOpenDrawer(tech)}
                      className="p-6 flex items-center justify-between hover:bg-zinc-50/50 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        {/* Initial circle avatar with status indicator */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-extrabold shadow-sm ring-2 ring-white">
                            {tech.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            activeTechnicianIds.includes(tech.id)
                              ? 'bg-emerald-500'
                              : tech.lifecycleStatus === 'on_leave'
                              ? 'bg-amber-550'
                              : 'bg-zinc-400'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-1">
                            <h3 className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">{tech.fullName}</h3>
                            <span className={`px-2 py-0.5 text-2xs font-extrabold tracking-wider uppercase rounded-full border ${
                              tech.role === 'helper' 
                                ? 'bg-teal-50 text-teal-700 border-teal-200' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {tech.role}
                            </span>
                            <span className={`px-2 py-0.5 text-2xs font-bold rounded-full border uppercase ${badgeClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-1">
                            <Mail className="w-3.5 h-3.5" /> {tech.email}
                          </p>
                          
                          {/* Compliance Bar */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  complianceCount === 6 ? 'bg-emerald-500' : complianceCount >= 3 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${compliancePercent}%` }}
                              />
                            </div>
                            <span className="text-2xs text-zinc-400 font-semibold">201 Docs: {complianceCount}/6 ({compliancePercent}%)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-mono text-zinc-950 font-bold text-sm tracking-tight">{formatPhp(tech.baseSalary)}</p>
                          <p className="text-xs text-zinc-400 flex items-center justify-end gap-1 mt-1">
                            <Calendar className="w-3 h-3" /> Hire: {tech.hireDate ? new Date(tech.hireDate).toLocaleDateString(undefined, { dateStyle: 'short' }) : 'Pending'}
                          </p>
                        </div>

                        {deleteId === tech.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={(e) => handleDelete(tech.id, e)}
                              disabled={deleting}
                              className="px-2.5 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                              {deleting ? "..." : "Confirm"}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteId(null); }}
                              disabled={deleting}
                              className="px-2.5 py-1.5 bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg hover:bg-zinc-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteId(tech.id); }}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-zinc-500 font-medium">
                    Showing <span className="font-semibold text-zinc-900">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold text-zinc-900">
                      {Math.min(startIndex + itemsPerPage, totalItems)}
                    </span>{" "}
                    of <span className="font-semibold text-zinc-900">{totalItems}</span> employees
                  </p>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Previous Button */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-zinc-600 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer flex items-center justify-center"
                      title="Previous Page"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const isCurrent = page === currentPage;
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-9 h-9 px-2 rounded-xl text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer flex items-center justify-center border ${
                              isCurrent
                                ? "bg-indigo-650 border-indigo-650 text-white shadow-xs"
                                : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-zinc-605 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer flex items-center justify-center"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* Right: Registration Panel */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" /> Register Employee
            </h2>
            <button
              onClick={() => {
                setIsBulkDrawerOpen(true)
                setBulkResults(null)
              }}
              className="text-xs px-3 py-1.5 bg-zinc-150 hover:bg-zinc-200 border border-zinc-250 text-zinc-700 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> Bulk Import
            </button>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-3 transition-all duration-300 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Account registered successfully!</p>
                <p className="text-sm mt-1">Their profile has been configured, and they can sign in to the mobile application immediately.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Registration Failed</p>
                <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateTechnician} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Full Name</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input name="fullName" required type="text" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm" placeholder="Juan Dela Cruz" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input name="email" required type="email" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm" placeholder="juan@gmail.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Role Type</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <select 
                  name="role" 
                  required 
                  value={roleInput}
                  onChange={(e) => {
                    const val = e.target.value
                    setRoleInput(val)
                    if (val === "technician") setBaseSalaryInput("20000")
                    else if (val === "helper") setBaseSalaryInput("15000")
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm"
                >
                  <option value="technician">Technician</option>
                  <option value="helper">Helper</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Branch Location</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <select name="branchId" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm">
                  <option value="">No Branch / Global</option>
                  {officeLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Default Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input name="password" required type="text" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm" placeholder="123123123" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Base Salary (₱)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₱</span>
                <input 
                  name="baseSalary" 
                  required 
                  type="number" 
                  min="0" 
                  value={baseSalaryInput}
                  onChange={e => setBaseSalaryInput(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm font-mono"
                  placeholder="25000" 
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full mt-6 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Employee Account"}
            </button>
          </form>
        </div>
      </div>

      {/* Slide-over Right Console Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity flex justify-end">
          {/* Drawer Panel */}
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-6 border-b border-zinc-150 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">{selectedEmployee.fullName}</h3>
                <p className="text-sm text-zinc-500 mt-0.5">{selectedEmployee.email} • <span className="font-semibold uppercase text-xs">{selectedEmployee.role}</span></p>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)} 
                className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-150 px-6">
              <button 
                onClick={() => {
                  setActiveTab('profile')
                  setFeedbackMsg({ type: '', text: '' })
                }} 
                className={`py-3.5 px-4 text-sm font-bold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                  activeTab === 'profile' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <FileText className="w-4 h-4" /> 201 Checklist & Compliance
              </button>
              <button 
                onClick={() => {
                  setActiveTab('attendance')
                  setFeedbackMsg({ type: '', text: '' })
                  loadEmployeeLogs(selectedEmployee.id)
                }} 
                className={`py-3.5 px-4 text-sm font-bold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                  activeTab === 'attendance' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Clock className="w-4 h-4" /> Attendance & DTR Logs
              </button>
              <button 
                onClick={() => {
                  setActiveTab('overrides')
                  setFeedbackMsg({ type: '', text: '' })
                  loadOverrideLogs(selectedEmployee.id)
                }} 
                className={`py-3.5 px-4 text-sm font-bold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                  activeTab === 'overrides' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <History className="w-4 h-4" /> Overrides History
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Feedback messages */}
              {feedbackMsg.text && (
                <div className={`p-4 rounded-xl border text-sm flex items-start gap-2.5 ${
                  feedbackMsg.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {feedbackMsg.type === 'success' ? <Check className="w-4.5 h-4.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-bold">{feedbackMsg.type === 'success' ? 'Success' : 'Error occurred'}</p>
                    <p className="text-xs mt-0.5 leading-relaxed">{feedbackMsg.text}</p>
                  </div>
                </div>
              )}

              {activeTab === 'profile' ? (
                <div className="space-y-6">
                  {/* Status & Manager & Hire Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Employment Status</label>
                      <select 
                        disabled={!canEdit201 || loadingAction}
                        value={status} 
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-850 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="ojt">OJT (3 months)</option>
                        <option value="contractual">Contractual (5 months)</option>
                        <option value="provisionary">Provisionary (6 months)</option>
                        <option value="regular">Regular</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Hire Date</label>
                      <input 
                        disabled={!canEdit201 || loadingAction}
                        type="date" 
                        value={hireDate} 
                        onChange={(e) => setHireDate(e.target.value)}
                        className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-850 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Lifecycle Status</label>
                      <select 
                        disabled={!canEdit201 || loadingAction}
                        value={drawerLifecycleStatus} 
                        onChange={(e) => setDrawerLifecycleStatus(e.target.value)}
                        className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-850 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="terminated">Terminated</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Assigned Branch Location</label>
                      <select 
                        disabled={!canEdit201 || loadingAction}
                        value={drawerBranchId} 
                        onChange={(e) => setDrawerBranchId(e.target.value)}
                        className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-850 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">No Branch / Global</option>
                        {officeLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Reporting Manager (Org Routing)</label>
                      <select 
                        disabled={!canEdit201 || loadingAction}
                        value={managerId} 
                        onChange={(e) => setManagerId(e.target.value)}
                        className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-850 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">No Manager Assigned</option>
                        {potentialManagers.map((mgr) => (
                          <option key={mgr.id} value={mgr.id}>{mgr.full_name} ({mgr.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <hr className="border-zinc-100" />

                  {/* 201 Checklist */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3.5 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-500" /> Documents Checklist (201 File Compliance)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { id: 'sss', label: 'SSS ID / Verification', state: sss, setState: setSss },
                        { id: 'philhealth', label: 'PhilHealth Verification', state: philhealth, setState: setPhilhealth },
                        { id: 'pagibig', label: 'Pag-IBIG Identification', state: pagibig, setState: setPagibig },
                        { id: 'nbi', label: 'NBI Clearance', state: nbi, setState: setNbi },
                        { id: 'resume', label: 'Resume / CV Document', state: resume, setState: setResume },
                        { id: 'medical', label: 'Medical Clearance', state: medical, setState: setMedical },
                      ].map((item) => (
                        <label 
                          key={item.id} 
                          className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all select-none cursor-pointer ${
                            item.state 
                              ? 'bg-emerald-50/40 border-emerald-250 text-emerald-950 font-semibold' 
                              : 'bg-zinc-50 border-zinc-150 text-zinc-650 hover:bg-zinc-100/50'
                          }`}
                        >
                          <input 
                            disabled={!canEdit201 || loadingAction}
                            type="checkbox" 
                            checked={item.state} 
                            onChange={(e) => item.setState(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-zinc-300 focus:ring-emerald-500"
                          />
                          <span className="text-xs leading-none">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {canEdit201 ? (
                    <button 
                      onClick={handleSave201}
                      disabled={loadingAction}
                      className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-sm active:scale-98 mt-6 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save 201 Checklist & Details"}
                    </button>
                  ) : (
                    <div className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-500 rounded-xl text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Viewing Mode: You do not have permissions to modify 201 checklists.</span>
                    </div>
                  )}
                </div>
              ) : activeTab === 'attendance' ? (
                <div className="space-y-6">
                  {/* Manual Overrides Form */}
                  {canOverrideDtr ? (
                    <form onSubmit={handleAddManualLog} className="p-4 bg-zinc-50 border border-zinc-250 rounded-xl space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-indigo-500" /> Insert Manual Clock Log (DTR Override)
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Clock In (Date & Time)</label>
                          <input 
                            required
                            type="datetime-local" 
                            value={manualClockIn} 
                            onChange={(e) => setManualClockIn(e.target.value)}
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white text-zinc-850 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Clock Out (Date & Time)</label>
                          <input 
                            required
                            type="datetime-local" 
                            value={manualClockOut} 
                            onChange={(e) => setManualClockOut(e.target.value)}
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white text-zinc-850 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-2xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Override Justification (Reason)</label>
                        <textarea 
                          required
                          value={manualJustification} 
                          onChange={(e) => setManualJustification(e.target.value)}
                          placeholder="Provide the reason for inserting this manual log..."
                          className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white text-zinc-850 text-xs focus:ring-2 focus:ring-indigo-500 outline-none h-12 resize-none"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={loadingAction}
                        className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Insert Manual DTR Log"}
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-500 rounded-xl text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Manual Override Lock: Only supervisors, coordinators, or managers can override timecards.</span>
                    </div>
                  )}

                  <hr className="border-zinc-150" />

                  {/* Log list */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3.5 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-zinc-400" /> Time Log Records
                    </h4>

                    {loadingLogs ? (
                      <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <span className="text-xs font-medium">Fetching logs...</span>
                      </div>
                    ) : timeLogs.length === 0 ? (
                      <div className="py-12 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                        <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 font-medium">No clock records logged for this employee.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {timeLogs.map((log) => {
                          const dateStr = new Date(log.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' });
                          const clockInTime = log.app_time_in ? new Date(log.app_time_in).toLocaleTimeString(undefined, { timeStyle: 'short' }) : 'Unknown';
                          const clockOutTime = log.app_time_out ? new Date(log.app_time_out).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '--:--';
                          const durationStr = log.total_hours !== null ? `${log.total_hours} hrs` : 'Active / Working';
                          const isManualLog = log.is_manual_entry || log.geofence_status === 'manual_override';

                          if (editingLogId === log.id) {
                            return (
                              <form key={log.id} onSubmit={handleOverrideLog} className="p-4 bg-zinc-50 border border-indigo-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                                  <span className="text-xs font-bold text-zinc-850">✏️ Editing DTR Log</span>
                                  <button 
                                    type="button" 
                                    onClick={() => setEditingLogId(null)}
                                    className="text-zinc-400 hover:text-zinc-700 text-2xs font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-500 mb-0.5">New Clock In</label>
                                    <input 
                                      required
                                      type="datetime-local" 
                                      value={editClockIn} 
                                      onChange={(e) => setEditClockIn(e.target.value)}
                                      className="w-full px-2 py-1 border border-zinc-200 rounded bg-white text-zinc-850 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-500 mb-0.5">New Clock Out</label>
                                    <input 
                                      required
                                      type="datetime-local" 
                                      value={editClockOut} 
                                      onChange={(e) => setEditClockOut(e.target.value)}
                                      className="w-full px-2 py-1 border border-zinc-200 rounded bg-white text-zinc-850 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Justification (Reason for change)</label>
                                  <textarea 
                                    required
                                    value={editJustification} 
                                    onChange={(e) => setEditJustification(e.target.value)}
                                    placeholder="Provide the reason for overriding this log..."
                                    className="w-full px-2 py-1 border border-zinc-200 rounded bg-white text-zinc-850 text-xs focus:ring-1 focus:ring-indigo-500 outline-none h-12 resize-none"
                                  />
                                </div>
                                <button 
                                  type="submit"
                                  disabled={loadingAction}
                                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded text-xs transition-colors"
                                >
                                  {loadingAction ? "Saving Changes..." : "Save Override"}
                                </button>
                              </form>
                            );
                          }

                          return (
                            <div key={log.id} className={`p-4 rounded-xl border shadow-2xs flex items-center justify-between transition-colors ${log.is_suspicious ? 'bg-rose-50/70 border-rose-250' : 'bg-white border-zinc-200'}`}>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-zinc-850">📅 {dateStr}</span>
                                  {isManualLog ? (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-3xs font-extrabold rounded border border-slate-200 uppercase tracking-wider">Manual Entry</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-3xs font-extrabold rounded border border-emerald-100 uppercase tracking-wider">GPS Verified</span>
                                  )}
                                  {log.is_mocked && (
                                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-3xs font-bold rounded border border-rose-105 uppercase">Mock GPS</span>
                                  )}
                                  {log.is_suspicious && (
                                    <span className="px-1.5 py-0.5 bg-rose-600 text-white text-3xs font-extrabold rounded border border-rose-700 uppercase tracking-wider animate-pulse">Suspicious Clock</span>
                                  )}
                                </div>
                                <div className="text-2xs text-zinc-500 flex items-center gap-3">
                                  <span>In: <strong className="text-zinc-700">{clockInTime}</strong></span>
                                  <span>•</span>
                                  <span>Out: <strong className="text-zinc-700">{clockOutTime}</strong></span>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <span className={`text-xs font-bold ${log.total_hours === null ? 'text-emerald-600 animate-pulse' : 'text-zinc-800'}`}>
                                  {durationStr}
                                </span>
                                {log.gps_accuracy && !isManualLog && (
                                  <p className="text-3xs text-zinc-400">Acc: {log.gps_accuracy.toFixed(1)}m</p>
                                )}
                                {canOverrideDtr && (
                                  <button
                                    onClick={() => {
                                      setEditingLogId(log.id)
                                      const inDate = log.app_time_in ? new Date(log.app_time_in) : new Date();
                                      const outDate = log.app_time_out ? new Date(log.app_time_out) : new Date();
                                      
                                      const toLocalISO = (d: Date) => {
                                        const tzOffset = d.getTimezoneOffset() * 60000;
                                        const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
                                        return localISOTime;
                                      }
                                      
                                      setEditClockIn(toLocalISO(inDate))
                                      setEditClockOut(log.app_time_out ? toLocalISO(outDate) : '')
                                      setEditJustification('')
                                    }}
                                    className="text-indigo-650 hover:text-indigo-800 text-3xs font-extrabold uppercase hover:underline"
                                  >
                                    Override
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Overrides History view */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3.5 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-zinc-450" /> DTR Modification Audit Ledger
                    </h4>

                    {loadingOverrides ? (
                      <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <span className="text-xs font-medium">Fetching override history...</span>
                      </div>
                    ) : overrideLogs.length === 0 ? (
                      <div className="py-12 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                        <History className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 font-medium">No override history recorded for this employee.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {overrideLogs.map((h) => {
                          const creationDate = new Date(h.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                          const origIn = h.original_time_in ? new Date(h.original_time_in).toLocaleTimeString(undefined, { timeStyle: 'short' }) : 'None';
                          const origOut = h.original_time_out ? new Date(h.original_time_out).toLocaleTimeString(undefined, { timeStyle: 'short' }) : 'None';
                          const newIn = h.new_time_in ? new Date(h.new_time_in).toLocaleTimeString(undefined, { timeStyle: 'short' }) : 'None';
                          const newOut = h.new_time_out ? new Date(h.new_time_out).toLocaleTimeString(undefined, { timeStyle: 'short' }) : 'None';
                          const origDate = h.original_time_in ? new Date(h.original_time_in).toLocaleDateString() : '';
                          const newDate = h.new_time_in ? new Date(h.new_time_in).toLocaleDateString() : '';

                          return (
                            <div key={h.id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 text-xs">
                              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                                <span className="font-bold text-zinc-800">Modifier: {h.modifier?.full_name || 'System / Admin'}</span>
                                <span className="text-3xs text-zinc-400">{creationDate}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-3xs font-bold text-zinc-450 uppercase">Original Times</p>
                                  <p className="text-zinc-600 text-2xs">In: <strong className="text-zinc-800">{origIn}</strong></p>
                                  <p className="text-zinc-600 text-2xs">Out: <strong className="text-zinc-800">{origOut}</strong></p>
                                  {origDate && <p className="text-3xs text-zinc-400">Date: {origDate}</p>}
                                </div>
                                <div className="space-y-1 border-l border-zinc-200 pl-4">
                                  <p className="text-3xs font-bold text-indigo-600 uppercase">New Times</p>
                                  <p className="text-zinc-600 text-2xs">In: <strong className="text-zinc-800">{newIn}</strong></p>
                                  <p className="text-zinc-600 text-2xs">Out: <strong className="text-zinc-800">{newOut}</strong></p>
                                  {newDate && <p className="text-3xs text-zinc-400">Date: {newDate}</p>}
                                </div>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-zinc-150">
                                <p className="text-3xs font-bold text-zinc-450 uppercase mb-0.5">Override Justification</p>
                                <p className="text-zinc-700 text-2xs italic leading-relaxed">“{h.justification}”</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Bulk Import Drawer */}
      {isBulkDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-zinc-150 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">Bulk Import Employees</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Register multiple accounts at once using CSV paste format.</p>
              </div>
              <button 
                onClick={() => setIsBulkDrawerOpen(false)} 
                className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-2 text-zinc-600">
                <p className="font-bold text-zinc-800">CSV Input Specifications:</p>
                <p>Provide comma-separated values (one employee per line) in this order:</p>
                <p className="font-mono bg-zinc-100 p-1.5 rounded border border-zinc-200">Full Name, Email, Role, Base Salary, Branch Name</p>
                <p className="font-bold text-zinc-800 mt-2">Example Paste:</p>
                <pre className="font-mono bg-zinc-100 p-2 rounded border border-zinc-200 text-[10px] whitespace-pre-wrap leading-relaxed">
Juan Cruz, juan@gmail.com, technician, 20000, Main Office
Maria Santos, maria@gmail.com, helper, 15000, Quezon City Branch
Alex Reyes, alex@gmail.com, technician, 22500, </pre>
                <p className="text-[10px] text-zinc-500 italic mt-2">Note: Base passwords will be set automatically to `Password123!`. Employee role must be exactly `technician` or `helper`. Branch Name is optional (leave blank for no branch/global).</p>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-sm flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Import Failed</p>
                    <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Bulk Results Summary */}
              {bulkResults && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-800">Import Job Complete</p>
                      <p className="text-2xs text-zinc-500 mt-0.5">Processed {bulkResults.results.length} rows</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        {bulkResults.successCount} Success
                      </span>
                      {bulkResults.failureCount > 0 && (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                          {bulkResults.failureCount} Failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 text-zinc-400 font-bold uppercase tracking-wider">
                          <th className="p-3">Row</th>
                          <th className="p-3">Name</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {bulkResults.results.map((res: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="p-3 font-mono text-zinc-400">{res.rowNum}</td>
                            <td className="p-3 font-bold text-zinc-800 truncate max-w-[150px]">{res.name}</td>
                            <td className="p-3 text-right">
                              {res.success ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Success</span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100" title={res.error}>Failed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <form onSubmit={handleBulkImport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Paste CSV Data</label>
                  <textarea
                    required
                    rows={8}
                    value={bulkCsvData}
                    onChange={(e) => setBulkCsvData(e.target.value)}
                    placeholder="Juan Cruz, juan@gmail.com, technician, 20000, Main Office&#10;Maria Santos, maria@gmail.com, helper, 15000, Quezon City Branch"
                    className="w-full p-4 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bulkLoading || !bulkCsvData.trim()}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                >
                  {bulkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run Bulk Registration"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
