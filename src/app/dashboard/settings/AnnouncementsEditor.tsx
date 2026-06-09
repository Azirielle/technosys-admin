"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createAnnouncement, deleteAnnouncement } from "@/app/actions/announcements"
import { Megaphone, Trash2, Loader2, Info } from "lucide-react"

interface AnnouncementsEditorProps {
  initialAnnouncements: any[]
  officeLocations: any[]
  userRole: string
}

export default function AnnouncementsEditor({ 
  initialAnnouncements, 
  officeLocations, 
  userRole 
}: AnnouncementsEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const isLocked = !["super_admin", "admin", "hr", "ceo", "coo"].includes(userRole)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLocked) return

    setLoading(true)
    setError("")
    setSuccess(false)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await createAnnouncement(formData)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        form.reset()
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (isLocked) return
    if (!confirm("Are you sure you want to delete this announcement?")) return

    try {
      const res = await deleteAnnouncement(id)
      if (res.error) {
        alert(res.error)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      alert("Delete failed: " + err.message)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Broadcast Form */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-indigo-500" /> Publish Message
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Broadcast company announcements or notifications. Announcements targeted at a specific office will only appear on devices of technicians assigned to that branch.
        </p>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-xs font-semibold">
            Announcement published successfully!
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-250 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Announcement Title</label>
            <input 
              disabled={isLocked || loading}
              name="title" 
              required 
              type="text" 
              className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="e.g. System Maintenance Schedule" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Message Content</label>
            <textarea 
              disabled={isLocked || loading}
              name="content" 
              required 
              rows={4}
              className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" 
              placeholder="Describe the announcement details here..." 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Target Audience (Scope)</label>
            <select 
              disabled={isLocked || loading}
              name="targetBranchId"
              className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl bg-white text-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Global (All Branches & Teams)</option>
              {officeLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <button 
            disabled={isLocked || loading}
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : "Broadcast Message"}
          </button>
        </form>
      </div>

      {/* Broadcast Archive History List */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-zinc-900">Active Board Logs</h3>
        {initialAnnouncements.length === 0 ? (
          <div className="p-8 border border-dashed border-zinc-200 rounded-2xl text-center text-zinc-400 text-sm font-medium flex items-center justify-center gap-2">
            <Info className="w-4 h-4" /> No active announcements broadcasted.
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-150">
            {initialAnnouncements.map((ann) => (
              <div key={ann.id} className="p-5 flex items-start justify-between gap-4 hover:bg-zinc-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-zinc-950 text-sm">{ann.title}</h4>
                    <span className={`px-2 py-0.5 text-3xs font-extrabold tracking-wider uppercase rounded-full border ${
                      ann.target_branch_id 
                        ? 'bg-blue-50 text-blue-750 border-blue-200' 
                        : 'bg-zinc-50 text-zinc-700 border-zinc-250'
                    }`}>
                      {ann.branch?.name ? `🏢 ${ann.branch.name}` : 'Global'}
                    </span>
                  </div>
                  <p className="text-zinc-650 text-xs leading-relaxed whitespace-pre-line">{ann.content}</p>
                  <p className="text-3xs text-zinc-450 font-medium">
                    Published: {new Date(ann.created_at).toLocaleString()}
                  </p>
                </div>
                {!isLocked && (
                  <button 
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
