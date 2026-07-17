"use client"
import { useState, useTransition, useEffect, Fragment } from "react"
import { DollarSign, CheckCircle2, AlertCircle, Loader2, Copy, FileSpreadsheet, ChevronDown, ChevronUp, Search, Calendar, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { publishPayslip } from "@/app/actions/payroll"
import Pagination from "@/components/ui/Pagination"

export default function PayrollClient({ 
  technicians, 
  publishedPayslips,
  payrolls,
  isWriteAllowed = false,
  defaultStartDate,
  defaultEndDate
}: { 
  technicians: any[], 
  publishedPayslips: any[],
  payrolls: any[],
  isWriteAllowed?: boolean,
  defaultStartDate?: string,
  defaultEndDate?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [startDate, setStartDate] = useState(defaultStartDate || "")
  const [endDate, setEndDate] = useState(defaultEndDate || "")
  
  // Existing overrides tracking
  const [allowanceOverrides, setAllowanceOverrides] = useState<Record<string, string>>({})
  const [otOverrides, setOtOverrides] = useState<Record<string, string>>({})

  // New state variables for overhaul
  const [activeTab, setActiveTab] = useState<'drafts' | 'published'>('drafts')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (defaultStartDate) setStartDate(defaultStartDate)
  }, [defaultStartDate])

  useEffect(() => {
    if (defaultEndDate) setEndDate(defaultEndDate)
  }, [defaultEndDate])

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    router.push(`/dashboard/payroll?startDate=${start}&endDate=${end}`)
  }

  const formatPhp = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Employee", "Base Salary", "Worked Hours", "OT Hours", "Gross Pay", "SSS Deduct", "PhilHealth Deduct", "Pag-IBIG Deduct", "Allowances", "Net Pay"]
    const rows = payrolls.map(p => {
      const emp = p.technician
      const allowanceStr = allowanceOverrides[emp.id] !== undefined ? allowanceOverrides[emp.id] : String(p.defaultAllowances)
      const allowance = parseFloat(allowanceStr) || 0
      const initialOt = (p.breakdown?.otHours || 0) + (p.breakdown?.sundayOtHours || 0)
      const otStr = otOverrides[emp.id] !== undefined ? otOverrides[emp.id] : String(initialOt)
      const otHours = parseFloat(otStr) || 0
      const additionalOtHours = otHours - initialOt
      const additionalOtPay = additionalOtHours * (p.hourlyRate * 1.25)
      const grossPay = p.calculation.grossPay + additionalOtPay
      const netPay = Math.max(0, grossPay - p.calculation.sssDeduction - p.calculation.philhealthDeduction - p.calculation.pagibigDeduction + allowance)

      return [
        `"${emp.full_name.replace(/"/g, '""')}"`,
        emp.base_salary,
        p.totalHours,
        otHours,
        grossPay.toFixed(2),
        p.calculation.sssDeduction.toFixed(2),
        p.calculation.philhealthDeduction.toFixed(2),
        p.calculation.pagibigDeduction.toFixed(2),
        allowance.toFixed(2),
        netPay.toFixed(2)
      ]
    })

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `payroll_summary_${startDate}_to_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Copy TSV (Tab Separated Values) for direct Excel paste
  const handleCopyTSV = () => {
    const headers = ["Employee", "Base Salary", "Worked Hours", "OT Hours", "Gross Pay", "SSS", "PhilHealth", "Pag-IBIG", "Allowances", "Net Pay"]
    const rows = payrolls.map(p => {
      const emp = p.technician
      const allowanceStr = allowanceOverrides[emp.id] !== undefined ? allowanceOverrides[emp.id] : String(p.defaultAllowances)
      const allowance = parseFloat(allowanceStr) || 0
      const initialOt = (p.breakdown?.otHours || 0) + (p.breakdown?.sundayOtHours || 0)
      const otStr = otOverrides[emp.id] !== undefined ? otOverrides[emp.id] : String(initialOt)
      const otHours = parseFloat(otStr) || 0
      const additionalOtHours = otHours - initialOt
      const additionalOtPay = additionalOtHours * (p.hourlyRate * 1.25)
      const grossPay = p.calculation.grossPay + additionalOtPay
      const netPay = Math.max(0, grossPay - p.calculation.sssDeduction - p.calculation.philhealthDeduction - p.calculation.pagibigDeduction + allowance)

      return [
        emp.full_name,
        emp.base_salary,
        p.totalHours,
        otHours,
        grossPay.toFixed(2),
        p.calculation.sssDeduction.toFixed(2),
        p.calculation.philhealthDeduction.toFixed(2),
        p.calculation.pagibigDeduction.toFixed(2),
        allowance.toFixed(2),
        netPay.toFixed(2)
      ]
    })

    const tsvContent = [headers.join("\t"), ...rows.map(e => e.join("\t"))].join("\n")
    navigator.clipboard.writeText(tsvContent)
    alert("Payroll table copied to clipboard! You can paste (Ctrl+V) directly into Excel.")
  }

  const handlePublish = (p: any, allowances: number, otHours: number, netPay: number, grossPay: number) => {
    const emp = p.technician
    startTransition(async () => {
      const res = await publishPayslip({
        technician_id: emp.id,
        gross_pay: grossPay,
        sss_deduction: p.calculation.sssDeduction,
        philhealth_deduction: p.calculation.philhealthDeduction,
        pagibig_deduction: p.calculation.pagibigDeduction,
        allowances: allowances,
        net_pay: netPay
      })
      if (res && res.error) {
        alert(res.error)
      }
    })
  }

  const handleBulkPublish = () => {
    const drafts = payrolls.filter(p => !publishedPayslips.some(ps => ps.technician_id === p.technician.id))
    if (drafts.length === 0) return

    if (!confirm(`Are you sure you want to publish all ${drafts.length} draft payslips?`)) return

    startTransition(async () => {
      const promises = drafts.map(async p => {
        const emp = p.technician
        const allowanceStr = allowanceOverrides[emp.id] !== undefined ? allowanceOverrides[emp.id] : String(p.defaultAllowances)
        const allowances = parseFloat(allowanceStr) || 0
        const initialOt = (p.breakdown?.otHours || 0) + (p.breakdown?.sundayOtHours || 0)
        const otStr = otOverrides[emp.id] !== undefined ? otOverrides[emp.id] : String(initialOt)
        const otHours = parseFloat(otStr) || 0
        const additionalOtHours = otHours - initialOt
        const additionalOtPay = additionalOtHours * (p.hourlyRate * 1.25)
        const grossPay = p.calculation.grossPay + additionalOtPay
        const netPay = Math.max(0, grossPay - p.calculation.sssDeduction - p.calculation.philhealthDeduction - p.calculation.pagibigDeduction + allowances)

        return publishPayslip({
          technician_id: emp.id,
          gross_pay: grossPay,
          sss_deduction: p.calculation.sssDeduction,
          philhealth_deduction: p.calculation.philhealthDeduction,
          pagibig_deduction: p.calculation.pagibigDeduction,
          allowances: allowances,
          net_pay: netPay
        })
      })

      const results = await Promise.all(promises)
      const failed = results.filter(r => r && r.error)
      if (failed.length > 0) {
        alert(`Failed to publish ${failed.length} payslips: ${failed.map(f => f.error).join(', ')}`)
      } else {
        alert(`Successfully published all ${drafts.length} payslips.`)
      }
    })
  }

  const toggleRow = (empId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [empId]: !prev[empId]
    }))
  }

  const handleRowClick = (e: React.MouseEvent, empId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('button') || target.closest('a')) {
      return;
    }
    toggleRow(empId);
  }

  // overall calculations for the current date range
  const totalNetPayout = payrolls.reduce((sum, p) => {
    const emp = p.technician
    const allowanceStr = allowanceOverrides[emp.id] !== undefined ? allowanceOverrides[emp.id] : String(p.defaultAllowances)
    const allowances = parseFloat(allowanceStr) || 0
    const otStr = otOverrides[emp.id] !== undefined ? otOverrides[emp.id] : "0"
    const otHours = parseFloat(otStr) || 0
    const otPay = otHours * (p.hourlyRate * 1.25)
    const netPay = Math.max(0, p.calculation.grossPay + otPay - p.calculation.sssDeduction - p.calculation.philhealthDeduction - p.calculation.pagibigDeduction + allowances)
    return sum + netPay
  }, 0)

  const draftsCount = payrolls.filter(p => !publishedPayslips.some(ps => ps.technician_id === p.technician.id)).length

  // filter by active tab & client search query
  const filteredPayrolls = payrolls.filter(p => {
    const emp = p.technician
    const isPublished = publishedPayslips.some(ps => ps.technician_id === emp.id)
    const matchesTab = activeTab === 'published' ? isPublished : !isPublished
    const matchesSearch = emp.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  // pagination
  const itemsPerPage = 8
  const totalPages = Math.max(1, Math.ceil(filteredPayrolls.length / itemsPerPage))
  const currentPageSanitized = Math.min(currentPage, totalPages)
  const paginatedPayrolls = filteredPayrolls.slice(
    (currentPageSanitized - 1) * itemsPerPage,
    currentPageSanitized * itemsPerPage
  )

  return (
    <div className="p-8 pb-20 max-w-[1600px] mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950">Payroll & Taxes</h1>
          <p className="text-zinc-500 mt-1 text-sm font-medium">Automatic computation of SSS, PhilHealth, and Pag-IBIG. Overtime caps at 8 hrs.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-sm text-sm">
            <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Start:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => handleDateChange(e.target.value, endDate)} 
              className="border-0 p-0 text-zinc-900 focus:ring-0 font-semibold text-xs cursor-pointer" 
            />
            <span className="text-zinc-300">|</span>
            <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">End:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => handleDateChange(startDate, e.target.value)} 
              className="border-0 p-0 text-zinc-900 focus:ring-0 font-semibold text-xs cursor-pointer" 
            />
          </div>

          <button 
            onClick={handleCopyTSV} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-all shadow-sm cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Table
          </button>

          <button 
            onClick={handleExportCSV} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-all shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-emerald-700/80 font-bold text-xs uppercase tracking-wider block mb-1">Total Net Payout</span>
            <span className="text-3xl font-black text-emerald-900 font-tabular">{formatPhp(totalNetPayout)}</span>
          </div>
          <div className="bg-emerald-500/10 text-emerald-600 p-3.5 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider block mb-1">Cutoff Period</span>
            <span className="text-lg font-black text-zinc-800">{formatDate(startDate)} – {formatDate(endDate)}</span>
          </div>
          <div className="bg-zinc-500/10 text-zinc-600 p-3.5 rounded-xl border border-zinc-500/20">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-amber-700/80 font-bold text-xs uppercase tracking-wider block mb-1">Pending Drafts</span>
            <span className="text-3xl font-black text-amber-900 font-tabular">{draftsCount}</span>
          </div>
          <div className="bg-amber-500/10 text-amber-600 p-3.5 rounded-xl border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex border border-zinc-200 w-max bg-zinc-50/50 p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('drafts')
              setCurrentPage(1)
            }}
            className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
              activeTab === 'drafts'
                ? "bg-white text-zinc-950 shadow-sm border border-zinc-200/80"
                : "text-zinc-500 hover:text-zinc-950"
            }`}
          >
            Drafts ({draftsCount})
          </button>
          <button
            onClick={() => {
              setActiveTab('published')
              setCurrentPage(1)
            }}
            className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
              activeTab === 'published'
                ? "bg-white text-zinc-950 shadow-sm border border-zinc-200/80"
                : "text-zinc-500 hover:text-zinc-950"
            }`}
          >
            Published ({payrolls.length - draftsCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search employee by name..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
            />
          </div>

          {activeTab === 'drafts' && isWriteAllowed && draftsCount > 0 && (
            <button
              onClick={handleBulkPublish}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
              Bulk Publish ({draftsCount})
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Hours Worked</th>
                <th className="px-6 py-4">OT Hours</th>
                <th className="px-6 py-4">Allowances</th>
                <th className="px-6 py-4">Deductions</th>
                <th className="px-6 py-4 text-emerald-600">Net Pay</th>
                <th className="px-6 py-4 text-right pr-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500 font-medium">
                    No records found matching filters.
                  </td>
                </tr>
              ) : paginatedPayrolls.map(p => {
                const emp = p.technician
                const defaultAllowance = p.defaultAllowances
                const allowanceStr = allowanceOverrides[emp.id] !== undefined ? allowanceOverrides[emp.id] : String(defaultAllowance)
                const allowances = parseFloat(allowanceStr) || 0

                const initialOt = (p.breakdown?.otHours || 0) + (p.breakdown?.sundayOtHours || 0)
                const otStr = otOverrides[emp.id] !== undefined ? otOverrides[emp.id] : String(initialOt)
                const otHours = parseFloat(otStr) || 0
                const additionalOtHours = otHours - initialOt
                
                const otMultiplier = 1.25
                const additionalOtPay = additionalOtHours * (p.hourlyRate * otMultiplier)
                const grossPay = p.calculation.grossPay + additionalOtPay
                
                const netPay = Math.max(0, grossPay - p.calculation.sssDeduction - p.calculation.philhealthDeduction - p.calculation.pagibigDeduction + allowances)
                const isPublished = publishedPayslips.some(ps => ps.technician_id === emp.id)
                
                const sss = p.calculation.sssDeduction
                const philhealth = p.calculation.philhealthDeduction
                const pagibig = p.calculation.pagibigDeduction
                const totalDeductions = sss + philhealth + pagibig

                const regHours = p.breakdown?.regularHours || p.totalHours
                const basicPay = regHours * p.hourlyRate
                const holidayPay = p.breakdown?.holidayHours ? p.breakdown.holidayHours * p.hourlyRate : 0
                const totalOtPay = p.breakdown?.otPay !== undefined 
                   ? (p.breakdown.otPay + additionalOtPay) 
                   : (initialOt * p.hourlyRate * otMultiplier) + additionalOtPay
                const sundayPay = (p.breakdown?.sundayHours || 0) * p.hourlyRate * 1.3
                const totalEarnings = grossPay

                const isExpanded = !!expandedRows[emp.id]

                return (
                  <Fragment key={emp.id}>
                    <tr 
                      onClick={(e) => handleRowClick(e, emp.id)}
                      className={`hover:bg-zinc-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-zinc-50/20' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-zinc-900">{emp.full_name}</p>
                          {p.hasOpenLogs && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                              ⚠️ Open Log
                            </span>
                          )}
                          {p.warning === 'base_salary_not_set' && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                              ✕ No Salary Set
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 font-medium">{emp.role}</p>
                        {(p.paidLeaveDays > 0 || p.unpaidLeaveDays > 0) && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-md shadow-sm">
                              🌴 {p.paidLeaveDays > 0 ? `${p.paidLeaveDays} Paid` : ''}
                              {p.paidLeaveDays > 0 && p.unpaidLeaveDays > 0 ? ' | ' : ''}
                              {p.unpaidLeaveDays > 0 ? `${p.unpaidLeaveDays} Unpaid` : ''} Leave{p.paidLeaveDays + p.unpaidLeaveDays > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-600 font-tabular">{p.totalHours} hrs</p>
                        {(p.paidLeaveDays > 0 || p.unpaidLeaveDays > 0) && (
                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 font-tabular">
                            ({p.workedHours}h work
                            {p.paidLeaveDays > 0 ? ` + ${p.paidLeaveHours}h paid` : ''})
                          </p>
                        )}
                        {p.hasOpenLogs && (
                          <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                            Excludes active open shift
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          step="0.5" 
                          min="0"
                          disabled={isPublished || !isWriteAllowed}
                          value={otStr} 
                          onChange={(e) => setOtOverrides(prev => ({ ...prev, [emp.id]: e.target.value }))}
                          className="w-16 px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-950 font-tabular font-semibold text-zinc-700 bg-zinc-50/30 disabled:opacity-75 disabled:cursor-not-allowed text-center"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          disabled={isPublished || !isWriteAllowed}
                          value={allowanceStr} 
                          onChange={(e) => setAllowanceOverrides(prev => ({ ...prev, [emp.id]: e.target.value }))}
                          className="w-24 px-2.5 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-950 font-tabular font-semibold text-amber-700 bg-amber-50/30 disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleRow(emp.id)}
                          className="flex items-center gap-1.5 font-semibold text-rose-600 hover:text-rose-700 transition-colors font-tabular cursor-pointer"
                        >
                          -{formatPhp(totalDeductions)}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-rose-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-rose-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-600 text-base font-tabular">{formatPhp(netPay)}</td>
                      <td className="px-6 py-4 text-right pr-8">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm animate-none">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Published
                          </span>
                        ) : isWriteAllowed ? (
                          <button 
                            onClick={() => handlePublish(p, allowances, otHours, netPay, grossPay)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-zinc-950 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                            Publish Payslip
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-200 animate-none">
                            <AlertCircle className="w-3.5 h-3.5 text-zinc-400" /> Ready (Draft)
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expandable breakdown details */}
                    {isExpanded && (
                      <tr key={emp.id + '-detail'} className="bg-zinc-50/50">
                        <td colSpan={7} className="px-8 py-6 border-t border-b border-zinc-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Earnings Section */}
                            <div className="bg-white p-5 rounded-xl border border-zinc-200/80 shadow-sm">
                              <h4 className="font-bold text-zinc-900 text-sm mb-4 flex items-center gap-1.5 text-emerald-700">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Earnings Breakdown
                              </h4>
                              <div className="space-y-3 text-xs">
                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                  <span className="text-zinc-500 font-medium">Basic Pay ({regHours} hrs @ {formatPhp(p.hourlyRate)}/hr)</span>
                                  <span className="font-semibold text-zinc-800 font-tabular">{formatPhp(basicPay)}</span>
                                </div>
                                {p.breakdown?.sundayHours > 0 && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                    <span className="text-zinc-500 font-medium">Rest Day Pay ({p.breakdown.sundayHours} hrs @ 130%)</span>
                                    <span className="font-semibold text-zinc-800 font-tabular">{formatPhp(sundayPay)}</span>
                                  </div>
                                )}
                                {p.breakdown?.holidayHours > 0 && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                    <span className="text-zinc-500 font-medium">Holiday Pay</span>
                                    <span className="font-semibold text-zinc-800 font-tabular">{formatPhp(holidayPay)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                  <span className="text-zinc-500 font-medium">
                                    Overtime Pay ({otHours} hrs)
                                  </span>
                                  <span className="font-semibold text-zinc-800 font-tabular">{formatPhp(totalOtPay)}</span>
                                </div>
                                {p.breakdown?.lateDeductions > 0 && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 text-rose-600 font-medium">
                                    <span>Late Clock-in Penalty (₱1.00/min)</span>
                                    <span className="font-tabular">-{formatPhp(p.breakdown.lateDeductions)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center pt-2 font-bold text-sm text-zinc-900">
                                  <span>Total Gross Earnings</span>
                                  <span className="font-tabular">{formatPhp(totalEarnings)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Deductions Section */}
                            <div className="bg-white p-5 rounded-xl border border-zinc-200/80 shadow-sm">
                              <h4 className="font-bold text-zinc-900 text-sm mb-4 flex items-center gap-1.5 text-rose-700">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Statutory Deductions
                              </h4>
                              <div className="space-y-3 text-xs">
                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                  <span className="text-zinc-500 font-medium">SSS Premium</span>
                                  <span className="font-semibold text-rose-600 font-tabular">-{formatPhp(sss)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                  <span className="text-zinc-500 font-medium">PhilHealth Contribution</span>
                                  <span className="font-semibold text-rose-600 font-tabular">-{formatPhp(philhealth)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                                  <span className="text-zinc-500 font-medium">Pag-IBIG Contribution</span>
                                  <span className="font-semibold text-rose-600 font-tabular">-{formatPhp(pagibig)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 font-bold text-sm text-zinc-900">
                                  <span>Total Deductions</span>
                                  <span className="font-rose-600 font-tabular text-rose-600">-{formatPhp(totalDeductions)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPageSanitized}
          totalPages={totalPages}
          totalItems={filteredPayrolls.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemNamePlural="records"
        />
      </div>
      
      {/* Footer Info / Rules */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 text-sm text-zinc-600 shadow-inner">
        <h3 className="font-bold text-zinc-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-cyan-600" /> Active Computation Rules (2026 Tables)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <strong className="text-zinc-900 block mb-1">SSS Contribution</strong>
            Computed at 4.5% Employee Share. Maximum MSC cap of ₱30,000 applied.
          </div>
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <strong className="text-zinc-900 block mb-1">PhilHealth</strong>
            Computed at 2.5% Employee Share. Minimum ₱10k, Maximum ₱100k cap applied.
          </div>
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <strong className="text-zinc-900 block mb-1">Pag-IBIG (HDMF)</strong>
            Computed at 2% Employee Share. Maximum ₱10k fund salary applied (₱200 max deduction).
          </div>
        </div>
      </div>
    </div>
  )
}
