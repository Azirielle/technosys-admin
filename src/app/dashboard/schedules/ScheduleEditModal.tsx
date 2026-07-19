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
    attendance_mode: schedule.attendance_mode,
    geofence_lat: schedule.geofence_lat,
    geofence_lon: schedule.geofence_lon,
    geofence_radius: schedule.geofence_radius || 100
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

          {/* Geofence Verification Configuration */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-4 shadow-3xs">
            <div className="flex items-center justify-between border-b border-zinc-150 pb-1">
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
                  value={formData.geofence_lat ?? ""} 
                  onChange={e => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    setFormData({...formData, geofence_lat: val});
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="e.g. 120.9842"
                  value={formData.geofence_lon ?? ""} 
                  onChange={e => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    setFormData({...formData, geofence_lon: val});
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Geofence Radius</label>
              <select 
                value={formData.geofence_radius ?? 100} 
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setFormData({...formData, geofence_radius: val});
                }}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white cursor-pointer"
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
