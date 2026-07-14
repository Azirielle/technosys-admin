"use client"

import { useState } from "react"
import { X, Clock, Trash2, Edit2, ClipboardList } from "lucide-react"
import { submitEdit, requestDeletion } from "@/app/actions/crud"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"
import { useRouter } from "next/navigation"

interface InventoryEditModalProps {
  assignment: any
  onClose: () => void
}

export default function InventoryEditModal({ assignment, onClose }: InventoryEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: assignment.status,
    borrowed_at: assignment.borrowed_at ? new Date(assignment.borrowed_at).toISOString().slice(0, 16) : '',
    returned_at: assignment.returned_at ? new Date(assignment.returned_at).toISOString().slice(0, 16) : '',
    notes: assignment.notes || ''
  })
  
  const { alert, confirm } = useAlertConfirm()
  const router = useRouter()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        status: formData.status,
        borrowed_at: formData.borrowed_at ? new Date(formData.borrowed_at).toISOString() : null,
        returned_at: formData.returned_at ? new Date(formData.returned_at).toISOString() : null,
        notes: formData.notes
      }
      const res = await submitEdit('tool_assignments', assignment.id, assignment, payload, 'inventory')
      if (res.error) throw new Error(res.error)
      alert("Inventory record updated and audit logged.", "Success", "success")
      router.refresh()
      onClose()
    } catch (err: any) {
      alert(err.message, "Error", "destructive")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRequest = async () => {
    const reason = window.prompt("Please provide a reason for deleting this inventory record. This will be sent to the CEO for approval:")
    if (!reason) return

    setLoading(true)
    try {
      const res = await requestDeletion('tool_assignments', assignment.id, reason, 'inventory')
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
            <Edit2 className="w-5 h-5 text-indigo-500" />
            Edit Record
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200 transition-colors text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Borrowed At</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="datetime-local" 
                required
                value={formData.borrowed_at}
                onChange={e => setFormData({...formData, borrowed_at: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Returned At</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="datetime-local" 
                value={formData.returned_at}
                onChange={e => setFormData({...formData, returned_at: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Status / Condition</label>
            <select 
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="borrowed">Borrowed</option>
              <option value="returned">Returned (Good)</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">Notes</label>
            <div className="relative">
              <ClipboardList className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
              <textarea 
                rows={2}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              <Trash2 className="w-4 h-4" /> Delete
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
