"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createHoliday, deleteHoliday } from "@/app/actions/announcements"
import { CalendarDays, Trash2, Loader2, Info, Plus } from "lucide-react"

interface HolidaysEditorProps {
  initialHolidays: any[]
  userRole: string
}

export default function HolidaysEditor({ 
  initialHolidays, 
  userRole 
}: HolidaysEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const isLocked = !["super_admin", "admin"].includes(userRole)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLocked) return

    setLoading(true)
    setError("")
    setSuccess(false)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await createHoliday(formData)
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
    if (!confirm("Are you sure you want to delete this holiday from the calendar?")) return

    try {
      const res = await deleteHoliday(id)
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
      {/* Add Holiday Form */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-500" /> Configure Holidays
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Manage regular or special non-working holidays. The payroll calculation engine checks this list and applies the holiday multiplier (e.g. 1.30x for +30% pay, 2.00x for double pay) to hours worked on holiday dates.
        </p>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-xs font-semibold">
            Holiday added to the calendar successfully!
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-250 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Holiday Name</label>
            <input 
              disabled={isLocked || loading}
              name="name" 
              required 
              type="text" 
              className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
              placeholder="e.g. Independence Day" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Holiday Date</label>
            <input 
              disabled={isLocked || loading}
              name="holidayDate" 
              required 
              type="date" 
              className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Salary Multiplier</label>
            <div className="relative">
              <input 
                disabled={isLocked || loading}
                name="multiplier" 
                required 
                type="number" 
                step="0.05"
                min="1.00"
                max="3.00"
                defaultValue="1.30"
                className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">x</span>
            </div>
            <p className="text-3xs text-zinc-400 mt-1">1.30 = +30% premium (special non-working), 2.00 = double pay (regular holiday)</p>
          </div>

          <button 
            disabled={isLocked || loading}
            type="submit"
            className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (
              <>
                <Plus className="w-4 h-4" /> Add Holiday
              </>
            )}
          </button>
        </form>
      </div>

      {/* Holidays List */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-zinc-900">National Holidays</h3>
        {initialHolidays.length === 0 ? (
          <div className="p-8 border border-dashed border-zinc-200 rounded-2xl text-center text-zinc-400 text-sm font-medium flex items-center justify-center gap-2">
            <Info className="w-4 h-4" /> No holidays configured on the calendar.
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-150">
            {initialHolidays.map((hol) => (
              <div key={hol.id} className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex flex-col items-center justify-center text-emerald-700 shrink-0 border border-emerald-100">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 text-sm">{hol.name}</h4>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      📅 {new Date(hol.holiday_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="px-2.5 py-1 bg-emerald-100/60 text-emerald-800 font-extrabold text-xs rounded-lg border border-emerald-200">
                    {Number(hol.multiplier).toFixed(2)}x Pay
                  </span>
                  {!isLocked && (
                    <button 
                      onClick={() => handleDelete(hol.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
