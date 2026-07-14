"use client"

import { useState } from "react"
import { X, Calendar, MapPin, Building, Trash2, ShieldAlert } from "lucide-react"
import { submitEdit, requestDeletion } from "@/app/actions/crud"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"

interface ScheduleEditModalProps {
  schedule: any
  onClose: () => void
  onSuccess: () => void
}

export default function ScheduleEditModal({ schedule, onClose, onSuccess }: ScheduleEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    client_name: schedule.client_name,
    location: schedule.location,
    attendance_mode: schedule.attendance_mode
  })
  
  const { alert, confirm } = useAlertConfirm()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await submitEdit('schedules', schedule.id, schedule, formData, 'schedules')
      if (res.error) throw new Error(res.error)
      alert("Schedule updated successfully and audit logged.", "Success", "success")
      onSuccess()
    } catch (err: any) {
      alert(err.message, "Error", "destructive")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRequest = async () => {
    const reason = window.prompt("Please provide a reason for deleting this schedule. This will be sent to the CEO for approval:")
    if (!reason) return

    setLoading(true)
    try {
      const res = await requestDeletion('schedules', schedule.id, reason, 'schedules')
      if (res.error) throw new Error(res.error)
      alert("Deletion request sent to CEO.", "Success", "success")
      onSuccess()
    } catch (err: any) {
      alert(err.message, "Error", "destructive")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            Edit Schedule
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200 transition-colors text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Client Name</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                required
                value={formData.client_name}
                onChange={e => setFormData({...formData, client_name: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Location / Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                required
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Attendance Mode</label>
            <select 
              value={formData.attendance_mode}
              onChange={e => setFormData({...formData, attendance_mode: e.target.value})}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="hq">Pacita HQ</option>
              <option value="direct_dispatch">Direct Dispatch</option>
              <option value="out_of_town">Out of Town</option>
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
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
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
