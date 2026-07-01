"use client"
import { useState, useTransition, useEffect } from "react"
import { DollarSign, CheckCircle2, AlertCircle, Loader2, Copy, FileSpreadsheet } from "lucide-react"
import { publishPayslip } from "@/app/actions/payroll"
import { useRouter } from "next/navigation"

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
  const [allowanceOverrides, setAllowanceOverrides] = useState<Record<string, string>>({})
  const [otOverrides, setOtOverrides] = useState<Record<string, string>>({})

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

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Employee", "Base Salary", "Worked Hours", "OT Hours", "Gross Pay", "SSS Deduct", "PhilHealth Deduct", "Pag-IBIG Deduct", "Allowances", "Net Pay"]
    const rows = payrolls.map(p => {
      const emp = p.technician
      const allowanceStr = allowanceOverrides[emp.id] !== undefined ? allowanceOverrides[emp.id] : String(p.defaultAllowances)
      const allowance = parseFloat(allowanceStr) || 0
      const otStr = otOverrides[emp.id] !== undefined ? otOverrides[emp.id] : "0"
      const otHours = parseFloat(otStr) || 0
      const otPay = otHours * (p.hourlyRate * 1.25)
      const grossPay = p.calculation.grossPay + otPay
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
      const otStr = otOverrides[emp.id] !== undefined ? otOverrides[emp.id] : "0"
      const otHours = parseFloat(otStr) || 0
      const otPay = otHours * (p.hourlyRate * 1.25)
      const grossPay = p.calculation.grossPay + otPay
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

  const handlePublish = (p: any, allowances: number, otHours: number, netPay: number) => {
    const emp = p.technician
    const otPay = otHours * (p.hourlyRate * 1.25)
    startTransition(async () => {
      await publishPayslip({
        technician_id: emp.id,
        gross_pay: p.calculation.grossPay + otPay,
        sss_deduction: p.calculation.sssDeduction,
        philhealth_deduction: p.calculation.philhealthDeduction,
        pagibig_deduction: p.calculation.pagibigDeduction,
        allowances: allowances,
        net_pay: netPay
      })
    })
  }

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Payroll & Taxes</h1>
          <p className="text-zinc-500 mt-1">Automatic computation of SSS, PhilHealth, and Pag-IBIG. Overtime caps at 8 hrs.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm text-sm">
            <span className="text-zinc-500 font-medium">Start:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => handleDateChange(e.target.value, endDate)} 
              className="border-0 p-0 text-zinc-900 focus:ring-0 font-semibold text-xs" 
            />
            <span className="text-zinc-300">|</span>
            <span className="text-zinc-500 font-medium">End:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => handleDateChange(startDate, e.target.value)} 
              className="border-0 p-0 text-zinc-900 focus:ring-0 font-semibold text-xs" 
            />
          </div>

          <button 
            onClick={handleCopyTSV} 
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-lg text-sm font-semibold text-zinc-700 transition-colors cursor-pointer"
          >
            <Copy className="h-4 w-4" /> Copy Table
          </button>

          <button 
            onClick={handleExportCSV} 
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-lg text-sm font-semibold text-zinc-700 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Hours</th>
                <th className="px-6 py-4">OT Hours</th>
                <th className="px-6 py-4">Gross Pay</th>
                <th className="px-6 py-4 text-rose-500">SSS</th>
                <th className="px-6 py-4 text-rose-500">PhilHealth</th>
                <th className="px-6 py-4 text-rose-500">Pag-IBIG</th>
                <th className="px-6 py-4 text-amber-600">Allowances</th>
                <th className="px-6 py-4 text-emerald-600">Net Pay</th>
                <th className="px-6 py-4">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-zinc-500">No records found for range.</td>
                </tr>
              ) : payrolls.map(p => {
                const emp = p.technician
                const defaultAllowance = p.defaultAllowances
                const allowanceStr = allowanceOverrides[emp.id] !== undefined ? allowanceOverrides[emp.id] : String(defaultAllowance)
                const allowances = parseFloat(allowanceStr) || 0

                const otStr = otOverrides[emp.id] !== undefined ? otOverrides[emp.id] : "0"
                const otHours = parseFloat(otStr) || 0
                const otPay = otHours * (p.hourlyRate * 1.25)
                const grossPay = p.calculation.grossPay + otPay
                
                const netPay = Math.max(0, grossPay - p.calculation.sssDeduction - p.calculation.philhealthDeduction - p.calculation.pagibigDeduction + allowances)
                const isPublished = publishedPayslips.some(ps => ps.technician_id === emp.id)
                
                return (
                  <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-zinc-900">{emp.full_name}</p>
                        {p.hasOpenLogs && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                            ⚠️ Open Log
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
                    <td className="px-6 py-4 font-bold text-zinc-900 font-tabular">{formatPhp(grossPay)}</td>
                    <td className="px-6 py-4 font-medium text-rose-600 font-tabular">-{formatPhp(p.calculation.sssDeduction)}</td>
                    <td className="px-6 py-4 font-medium text-rose-600 font-tabular">-{formatPhp(p.calculation.philhealthDeduction)}</td>
                    <td className="px-6 py-4 font-medium text-rose-600 font-tabular">-{formatPhp(p.calculation.pagibigDeduction)}</td>
                    <td className="px-6 py-4">
                      <input 
                        type="number" 
                        disabled={isPublished || !isWriteAllowed}
                        value={allowanceStr} 
                        onChange={(e) => setAllowanceOverrides(prev => ({ ...prev, [emp.id]: e.target.value }))}
                        className="w-24 px-2.5 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-950 font-tabular font-semibold text-amber-700 bg-amber-50/30 disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-600 text-base font-tabular">{formatPhp(netPay)}</td>
                    <td className="px-6 py-4">
                      {isPublished ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-max border border-emerald-200 shadow-sm animate-none">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Published
                        </span>
                      ) : isWriteAllowed ? (
                        <button 
                          onClick={() => handlePublish(p, allowances, otHours, netPay)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 cursor-pointer w-max shadow-sm"
                        >
                          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                          Publish Payslip
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-full w-max border border-zinc-200 animate-none">
                          <AlertCircle className="w-3.5 h-3.5 text-zinc-400" /> Ready (Draft)
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8 bg-zinc-50 border border-zinc-200 rounded-xl p-6 text-sm text-zinc-600 shadow-inner">
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
