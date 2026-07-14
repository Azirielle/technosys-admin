"use client"

import { useState } from "react"
import { X, Clock, Trash2, Edit2 } from "lucide-react"
import { submitEdit, requestDeletion } from "@/app/actions/crud"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"
import { useRouter } from "next/navigation"

interface AttendanceEditModalProps {
  record: any
  onClose: () => void
}

export default function AttendanceEditModal({ record, onClose }: AttendanceEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    app_time_in: record.app_time_in ? new Date(record.app_time_in).toISOString().slice(0, 16) : '',
    photo_status: record.photo_status
  })
  
  const { alert, confirm } = useAlertConfirm()
  const router = useRouter()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        app_time_in: new Date(formData.app_time_in).toISOString(),
        photo_status: formData.photo_status
      }
      const res = await submitEdit('time_logs', record.id, record, payload, 'attendance')
      if (res.error) throw new Error(res.error)
      alert("Attendance record updated and audit logged.", "Success", "success")
      router.refresh()
      onClose()
    } catch (err: any) {
      alert(err.message, "Error", "destructive")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRequest = async () => {
    const reason = window.prompt("Please provide a reason for deleting this DTR log. This will be sent to the CEO for approval:")
    if (!reason) return

    setLoading(true)
    try {
      const res = await requestDeletion('time_logs', record.id, reason, 'attendance')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-emerald-500" />
            Edit DTR Record
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200 transition-colors text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Time In</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="datetime-local" 
                required
                value={formData.app_time_in}
                onChange={e => setFormData({...formData, app_time_in: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Status</label>
            <select 
              value={formData.photo_status}
              onChange={e => setFormData({...formData, photo_status: e.target.value})}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
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
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
