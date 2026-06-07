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
  bulkRegisterEmployees
} from "@/app/actions/employees"
import { createClient } from "@/lib/supabase/client"

interface EmployeesClientProps {
  initialTechnicians: TechnicianInfo[]
}

export default function EmployeesClient({ initialTechnicians }: EmployeesClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filtering states
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'on_leave' | 'off_duty'>('all')

  const totalForceCount = initialTechnicians.length
  const activeCount = initialTechnicians.filter(t => t.currentStatus === 'active').length
  const onLeaveCount = initialTechnicians.filter(t => t.currentStatus === 'on_leave').length
  const offDutyCount = initialTechnicians.filter(t => t.currentStatus === 'off_duty').length

  const filteredTechnicians = initialTechnicians.filter(tech => {
    if (statusFilter === 'all') return true
    return tech.currentStatus === statusFilter
  })

  // Current logged in admin role
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [potentialManagers, setPotentialManagers] = useState<any[]>([])

  // Drawer / Selection states
  const [selectedEmployee, setSelectedEmployee] = useState<TechnicianInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance'>('profile')
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

  // Attendance states
  const [timeLogs, setTimeLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [manualClockIn, setManualClockIn] = useState('')
  const [manualClockOut, setManualClockOut] = useState('')

  // Registration Form States
  const [registerRole, setRegisterRole] = useState("technician")
  const [registerBaseSalary, setRegisterBaseSalary] = useState("20000")

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setRegisterRole(val)
    if (val === "technician") {
      setRegisterBaseSalary("20000")
    } else if (val === "helper") {
      setRegisterBaseSalary("15000")
    }
  }

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterBaseSalary(e.target.value)
  }

  // CSV Import States
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false)
  const [csvText, setCsvText] = useState("")
  const [parsedEmployees, setParsedEmployees] = useState<any[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const handleParseCsv = (text: string) => {
    setParseError(null)
    setImportResult(null)
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
      if (lines.length === 0) {
        setParsedEmployees([])
        return
      }

      // Check headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const fullNameIdx = headers.indexOf('fullname')
      const emailIdx = headers.indexOf('email')
      const roleIdx = headers.indexOf('role')
      const salaryIdx = headers.indexOf('basesalary')
      const passwordIdx = headers.indexOf('password')

      if (fullNameIdx === -1 || emailIdx === -1 || roleIdx === -1 || salaryIdx === -1 || passwordIdx === -1) {
        throw new Error("CSV must contain headers: fullName, email, role, baseSalary, password")
      }

      const results = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const values = parseCsvLine(line)
        if (values.length < 5) continue

        const fullName = values[fullNameIdx]?.trim()
        const email = values[emailIdx]?.trim()
        const role = values[roleIdx]?.trim().toLowerCase()
        const baseSalary = Number(values[salaryIdx]?.trim())
        const password = values[passwordIdx]?.trim()

        if (!fullName || !email || !role || isNaN(baseSalary) || !password) {
          throw new Error(`Row ${i + 1} has invalid or missing values.`)
        }
        if (role !== 'technician' && role !== 'helper') {
          throw new Error(`Row ${i + 1} role must be 'technician' or 'helper'.`)
        }
        if (baseSalary < 0) {
          throw new Error(`Row ${i + 1} baseSalary must be non-negative.`)
        }
        if (password.length < 6) {
          throw new Error(`Row ${i + 1} password must be at least 6 characters.`)
        }

        results.push({ fullName, email, role, baseSalary, password })
      }

      setParsedEmployees(results)
    } catch (err: any) {
      setParseError(err.message)
      setParsedEmployees([])
    }
  }

  function parseCsvLine(line: string) {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const handleBulkImport = async () => {
    if (parsedEmployees.length === 0) return
    setImporting(true)
    setParseError(null)
    setImportResult(null)

    try {
      const res = await bulkRegisterEmployees(parsedEmployees)
      if (res.error) {
        setImportResult({ success: false, message: res.error })
      } else {
        setImportResult({ success: true, message: `Successfully registered ${res.count} employees!` })
        setCsvText("")
        setParsedEmployees([])
        router.refresh()
      }
    } catch (err: any) {
      setImportResult({ success: false, message: err.message || "Bulk import failed." })
    } finally {
      setImporting(false)
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
      
      setSuccess(true)
      form.reset()
      setRegisterRole("technician")
      setRegisterBaseSalary("20000")
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
    
    // Reset manual DTR states
    setManualClockIn('')
    setManualClockOut('')
    setTimeLogs([])
  }

  const loadEmployeeLogs = async (employeeId: string) => {
    setLoadingLogs(true)
    const logs = await getEmployeeTimeLogs(employeeId)
    setTimeLogs(logs)
    setLoadingLogs(false)
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
      hireDate: hireDate ? new Date(hireDate).toISOString() : null
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
          hasMedicalClearance: medical
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
      const res = await addManualDtrLog(selectedEmployee.id, manualClockIn, manualClockOut)
      if (res.error) {
        setFeedbackMsg({ type: 'error', text: res.error })
      } else {
        setFeedbackMsg({ type: 'success', text: 'Manual DTR entry logged successfully!' })
        loadEmployeeLogs(selectedEmployee.id)
        setManualClockIn('')
        setManualClockOut('')
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

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto relative">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Manage Employees</h1>
          <p className="text-zinc-500 mt-1">Configure status, manager relationships, 201 files, and manual DTR cards.</p>
        </div>
      </div>

      {/* Status Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-zinc-950 border-zinc-950 text-white shadow-md'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-350 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-2xs font-extrabold tracking-wider uppercase ${statusFilter === 'all' ? 'text-zinc-400' : 'text-zinc-500'}`}>Total Force</span>
            <Users className={`w-5 h-5 ${statusFilter === 'all' ? 'text-zinc-300' : 'text-zinc-400 group-hover:scale-110 transition-transform'}`} />
          </div>
          <p className="text-2xl font-bold mt-2">{totalForceCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('active')}
          className={`p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
            statusFilter === 'active'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-350 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-2xs font-extrabold tracking-wider uppercase ${statusFilter === 'active' ? 'text-emerald-200' : 'text-zinc-500'}`}>Active Now</span>
            <div className={`w-2 h-2 rounded-full ${statusFilter === 'active' ? 'bg-white animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
          </div>
          <p className="text-2xl font-bold mt-2">{activeCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('off_duty')}
          className={`p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
            statusFilter === 'off_duty'
              ? 'bg-zinc-600 border-zinc-600 text-white shadow-md'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-350 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-2xs font-extrabold tracking-wider uppercase ${statusFilter === 'off_duty' ? 'text-zinc-300' : 'text-zinc-500'}`}>Off-Duty</span>
            <Clock className={`w-5 h-5 ${statusFilter === 'off_duty' ? 'text-zinc-300' : 'text-zinc-400 group-hover:scale-110 transition-transform'}`} />
          </div>
          <p className="text-2xl font-bold mt-2">{offDutyCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('on_leave')}
          className={`p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
            statusFilter === 'on_leave'
              ? 'bg-amber-600 border-amber-600 text-white shadow-md'
              : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-350 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-2xs font-extrabold tracking-wider uppercase ${statusFilter === 'on_leave' ? 'text-amber-200' : 'text-zinc-500'}`}>On-Leave</span>
            <Calendar className={`w-5 h-5 ${statusFilter === 'on_leave' ? 'text-amber-300' : 'text-zinc-400 group-hover:scale-110 transition-transform'}`} />
          </div>
          <p className="text-2xl font-bold mt-2">{onLeaveCount}</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Registered Technicians List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" /> Employees Directory ({filteredTechnicians.length})
              </h2>
            </div>

            {filteredTechnicians.length === 0 ? (
              <div className="p-12 text-center">
                <UserPlus className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600 font-semibold">No matching employees found</p>
                <p className="text-sm text-zinc-400 mt-1">Try changing the status filter above.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredTechnicians.map((tech) => {
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
                            tech.currentStatus === 'active'
                              ? 'bg-emerald-500'
                              : tech.currentStatus === 'on_leave'
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
                setIsImportDrawerOpen(true)
                setParseError(null)
                setImportResult(null)
                setParsedEmployees([])
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
                  value={registerRole}
                  onChange={handleRoleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm"
                >
                  <option value="technician">Technician</option>
                  <option value="helper">Helper</option>
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm select-none">₱</span>
                <input 
                  name="baseSalary" 
                  required 
                  type="number" 
                  min="0" 
                  value={registerBaseSalary}
                  onChange={handleSalaryChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-zinc-800 text-sm font-mono" 
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
              ) : (
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

                          return (
                            <div key={log.id} className="p-4 bg-white rounded-xl border border-zinc-200 shadow-2xs flex items-center justify-between">
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
                                </div>
                                <div className="text-2xs text-zinc-500 flex items-center gap-3">
                                  <span>In: <strong className="text-zinc-700">{clockInTime}</strong></span>
                                  <span>•</span>
                                  <span>Out: <strong className="text-zinc-700">{clockOutTime}</strong></span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs font-bold ${log.total_hours === null ? 'text-emerald-600 animate-pulse' : 'text-zinc-800'}`}>
                                  {durationStr}
                                </span>
                                {log.gps_accuracy && !isManualLog && (
                                  <p className="text-3xs text-zinc-400 mt-0.5">Acc: {log.gps_accuracy.toFixed(1)}m</p>
                                )}
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

      {/* Slide-over Right CSV Import Drawer */}
      {isImportDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity flex justify-end">
          {/* Drawer Panel */}
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-6 border-b border-zinc-150 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Bulk Import Employees
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Upload a CSV file or paste raw CSV text to register multiple employees.</p>
              </div>
              <button 
                onClick={() => {
                  setIsImportDrawerOpen(false)
                  setCsvText("")
                  setParsedEmployees([])
                  setParseError(null)
                  setImportResult(null)
                }} 
                className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Instructions */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-650 space-y-2">
                <p className="font-bold text-zinc-800 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-indigo-500" /> CSV Format requirements:
                </p>
                <p>Ensure your CSV starts with a header row matching exactly: <code className="font-mono bg-zinc-200 px-1 py-0.5 rounded text-zinc-800">fullName, email, role, baseSalary, password</code></p>
                <p>Example row: <code className="font-mono bg-zinc-200 px-1 py-0.5 rounded text-zinc-800">Juan Dela Cruz, juan@gmail.com, technician, 25000, securePass123</code></p>
              </div>

              {/* CSV Input Area */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Paste CSV Contents</label>
                <textarea
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value)
                    handleParseCsv(e.target.value)
                  }}
                  placeholder="fullName,email,role,baseSalary,password&#10;Juan Dela Cruz,juan@gmail.com,technician,25000,password123&#10;Maria Santos,maria@gmail.com,helper,18000,password456"
                  className="w-full h-44 px-3.5 py-2.5 border border-zinc-250 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-zinc-850 text-xs font-mono resize-y"
                />
              </div>

              {/* Error messages */}
              {parseError && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">CSV Parsing Error</p>
                    <p className="mt-0.5 leading-relaxed">{parseError}</p>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
                  importResult.success 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                    : 'bg-rose-50 border-rose-250 text-rose-800'
                }`}>
                  {importResult.success ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-bold">{importResult.success ? 'Import Completed' : 'Import Failed'}</p>
                    <p className="mt-0.5 leading-relaxed">{importResult.message}</p>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {parsedEmployees.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Previewing {parsedEmployees.length} Row(s)
                  </h4>
                  <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-2xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 font-bold text-zinc-500 uppercase">
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Role</th>
                          <th className="p-2.5 text-right">Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-zinc-700">
                        {parsedEmployees.map((emp, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="p-2.5 font-bold">{emp.fullName}</td>
                            <td className="p-2.5 font-mono">{emp.email}</td>
                            <td className="p-2.5 uppercase font-semibold">{emp.role}</td>
                            <td className="p-2.5 text-right font-mono">{formatPhp(emp.baseSalary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-zinc-150 bg-zinc-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsImportDrawerOpen(false)
                  setCsvText("")
                  setParsedEmployees([])
                  setParseError(null)
                  setImportResult(null)
                }}
                disabled={importing}
                className="px-4 py-2.5 border border-zinc-250 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={parsedEmployees.length === 0 || importing || !!parseError}
                className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Import {parsedEmployees.length} Accounts
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
