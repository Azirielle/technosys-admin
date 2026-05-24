"use client"
import { useState, useTransition } from "react"
import { DollarSign, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { publishPayslip } from "@/app/actions/payroll"

export default function PayrollClient({ 
  technicians, 
  publishedPayslips,
  payrolls 
}: { 
  technicians: any[], 
  publishedPayslips: any[],
  payrolls: any[]
}) {
  const [isPending, startTransition] = useTransition()

  const formatPhp = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  }

  const handlePublish = (emp: any, payroll: any) => {
    startTransition(async () => {
      await publishPayslip({
        technician_id: emp.id,
        gross_pay: payroll.grossPay,
        sss_deduction: payroll.sssDeduction,
        philhealth_deduction: payroll.philhealthDeduction,
        pagibig_deduction: payroll.pagibigDeduction,
        net_pay: payroll.netPay
      })
    })
  }

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Payroll & Taxes</h1>
          <p className="text-zinc-500 mt-1">Automatic computation of SSS, PhilHealth, and Pag-IBIG contributions via Statutory Database.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Gross Pay</th>
                <th className="px-6 py-4 text-rose-500">SSS</th>
                <th className="px-6 py-4 text-rose-500">PhilHealth</th>
                <th className="px-6 py-4 text-rose-500">Pag-IBIG</th>
                <th className="px-6 py-4 text-emerald-600">Net Pay</th>
                <th className="px-6 py-4">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {technicians.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No technicians found.</td>
                </tr>
              ) : technicians.map(emp => {
                const payrollRecord = payrolls.find(p => p.technician_id === emp.id)
                const payroll = payrollRecord ? payrollRecord.calculation : {
                  grossPay: 0, sssDeduction: 0, philhealthDeduction: 0, pagibigDeduction: 0, netPay: 0
                }
                const isPublished = publishedPayslips.some(p => p.technician_id === emp.id)
                
                return (
                  <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900">{emp.full_name}</p>
                      <p className="text-xs text-zinc-500 font-medium">{emp.role}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-700">{formatPhp(payroll.grossPay)}</td>
                    <td className="px-6 py-4 text-rose-500 font-medium">-{formatPhp(payroll.sssDeduction)}</td>
                    <td className="px-6 py-4 text-rose-500 font-medium">-{formatPhp(payroll.philhealthDeduction)}</td>
                    <td className="px-6 py-4 text-rose-500 font-medium">-{formatPhp(payroll.pagibigDeduction)}</td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600 text-base">{formatPhp(payroll.netPay)}</td>
                    <td className="px-6 py-4">
                      {isPublished ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-max border border-emerald-200 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Published
                        </span>
                      ) : (
                        <button 
                          onClick={() => handlePublish(emp, payroll)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                          Publish Payslip
                        </button>
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
          <div className="bg-white p-4 rounded-lg border border-zinc-200">
            <strong className="text-zinc-900 block mb-1">SSS Contribution</strong>
            Computed at 4.5% Employee Share. Maximum MSC cap of ₱30,000 applied.
          </div>
          <div className="bg-white p-4 rounded-lg border border-zinc-200">
            <strong className="text-zinc-900 block mb-1">PhilHealth</strong>
            Computed at 2.5% Employee Share. Minimum ₱10k, Maximum ₱100k cap applied.
          </div>
          <div className="bg-white p-4 rounded-lg border border-zinc-200">
            <strong className="text-zinc-900 block mb-1">Pag-IBIG (HDMF)</strong>
            Computed at 2% Employee Share. Maximum ₱10k fund salary applied (₱200 max deduction).
          </div>
        </div>
      </div>
    </div>
  )
}
