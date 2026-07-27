"use client"

import { useState } from "react"
import { X, User, Trash2, Edit2, Mail, Briefcase } from "lucide-react"
import { submitEdit, requestDeletion } from "@/app/actions/crud"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"
import { useRouter } from "next/navigation"

interface EmployeeEditModalProps {
  employee: any
  onClose: () => void
}

export default function EmployeeEditModal({ employee, onClose }: EmployeeEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: employee.fullName,
    email: employee.email,
    role: employee.role,
    salary_rate_monthly: employee.salaryRateMonthly,
    employment_status: employee.employmentStatus || 'regular'
  })
  
  const { alert, confirm } = useAlertConfirm()
  const router = useRouter()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        salary_rate_monthly: Number(formData.salary_rate_monthly) || 0,
        employment_status: formData.employment_status
      }
      // Note: we fetch the original from DB, or map the camelCase to snake_case.
      // But submitEdit takes raw payloads. The table is 'profiles'.
      const originalRecord = {
        id: employee.id,
        full_name: employee.fullName,
        email: employee.email,
        role: employee.role,
        salary_rate_monthly: employee.salaryRateMonthly,
        employment_status: employee.employmentStatus
      }
      
      const res = await submitEdit('profiles', employee.id, originalRecord, payload, 'employees')
      if (res.error) throw new Error(res.error)
      alert("Employee profile updated and audit logged.", "Success", "success")
      router.refresh()
      onClose()
    } catch (err: any) {
      alert(err.message, "Error", "destructive")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRequest = async () => {
    const reason = window.prompt("Please provide a reason for deleting this employee. This will be sent to the CEO for approval:")
    if (!reason) return

    setLoading(true)
    try {
      const res = await requestDeletion('profiles', employee.id, reason, 'employees')
      if (res.error) throw new Error(res.error)
      alert("Deletion request sent to CEO.", "Success", "success")
      router.refresh()
      onClose()
    } catch (err: any) {
      alert(err.message, "Error", "destructive")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-indigo-500" />
            Edit Employee Profile
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200 transition-colors text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                required
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Role</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="helper">Helper</option>
                <option value="technician">Technician</option>
                <option value="senior_technician">Senior Technician</option>
                <option value="technician">Technician</option>
                <option value="admin">Admin</option>
                <option value="coordinator">Coordinator</option>
                <option value="super_admin">Super Admin</option>
                <option value="ceo">CEO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Status</label>
              <select 
                value={formData.employment_status}
                onChange={e => setFormData({...formData, employment_status: e.target.value})}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="ojt">OJT</option>
                <option value="contractual">Contractual</option>
                <option value="provisionary">Provisionary</option>
                <option value="regular">Regular</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Base Salary (Monthly)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₱</span>
              <input 
                type="number" 
                required
                value={formData.salary_rate_monthly}
                onChange={e => setFormData({...formData, salary_rate_monthly: e.target.value})}
                className="w-full pl-8 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-zinc-100">
            <button
              type="button"
              onClick={handleDeleteRequest}
              disabled={loading}
              className="px-3 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Request Deletion
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
