"use client"
import { useState } from "react"
import { Pencil, ShieldCheck } from "lucide-react"

export default function SssDataTable({ initialData, userRole }: { initialData: any[], userRole?: string }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isSuperAdmin = userRole === "super_admin"

  const formatPhp = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  }

  return (
    <div className="mb-8">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              SSS Contribution Matrix (15%)
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Official bracket table for the Social Security System deductions.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Min Compensation</th>
                <th className="px-6 py-4">Max Compensation</th>
                <th className="px-6 py-4 text-emerald-600">Monthly Salary Credit</th>
                <th className="px-6 py-4 text-rose-500">Employee Share</th>
                <th className="px-6 py-4 text-amber-600">Employer Share</th>
                {isSuperAdmin && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initialData && initialData.length > 0 ? (
                initialData.map((bracket, index) => (
                  <tr key={index} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">{formatPhp(bracket.min_compensation)}</td>
                    <td className="px-6 py-4">{bracket.max_compensation >= 9999999 ? "MAX" : formatPhp(bracket.max_compensation)}</td>
                    <td className="px-6 py-4 font-medium text-emerald-700">{formatPhp(bracket.monthly_salary_credit)}</td>
                    <td className="px-6 py-4 font-medium text-rose-600">{formatPhp(bracket.employee_share)}</td>
                    <td className="px-6 py-4 font-medium text-amber-600">{formatPhp(bracket.employer_share)}</td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setIsEditModalOpen(true)}
                          className="text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="Edit Bracket"
                        >
                          <Pencil className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-8 text-center text-zinc-500">
                    No SSS brackets loaded. Please run the database seed script.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-zinc-200 animate-in fade-in zoom-in duration-200 text-center">
            <h2 className="text-lg font-bold text-zinc-900 mb-2">Edit Bracket</h2>
            <p className="text-zinc-600 text-sm mb-6">
              Row-editing functionality will be implemented in a future sprint.
            </p>
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 w-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
