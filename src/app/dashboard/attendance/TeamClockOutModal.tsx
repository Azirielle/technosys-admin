"use client"
import { useState, useTransition } from "react"
import { X, AlertCircle, Loader2, CheckSquare, Square } from "lucide-react"
import { batchClockOut } from "@/app/actions/attendance"

export default function TeamClockOutModal({ 
  team, 
  onClose, 
  onSuccess 
}: { 
  team: any[]
  onClose: () => void
  onSuccess: () => void 
}) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  // Initially check everyone EXCEPT the driver
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    team.forEach(member => {
      // If they are the designated driver, leave unchecked
      if (member.isDriver) return
      initial.add(member.logId)
    })
    return initial
  })

  const toggleCheck = (logId: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(logId)) next.delete(logId)
      else next.add(logId)
      return next
    })
  }

  const handleConfirm = () => {
    if (checkedIds.size === 0) return

    setErrorMsg("")
    startTransition(async () => {
      const logIds = Array.from(checkedIds)
      const res = await batchClockOut(logIds)
      if (res && res.error) {
        setErrorMsg(res.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <h3 className="text-lg font-bold text-zinc-900">Clock Out Team</h3>
          <button onClick={onClose} disabled={isPending} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900 font-medium leading-relaxed">
              Ensure the driver has returned the company vehicle before clocking them out. Driver is unchecked by default.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold text-center border border-red-100">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
            {team.map((member) => {
              const isChecked = checkedIds.has(member.logId)
              return (
                <div 
                  key={member.logId}
                  onClick={() => toggleCheck(member.logId)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isChecked 
                      ? 'border-indigo-600 bg-indigo-50/30 shadow-sm' 
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className={`shrink-0 ${isChecked ? 'text-indigo-600' : 'text-zinc-400'}`}>
                    {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-900 text-sm truncate">{member.name}</p>
                    <p className="text-xs text-zinc-500 capitalize">{member.role} {member.isDriver && '- Designated Driver'}</p>
                  </div>
                  <div className="text-xs font-semibold text-zinc-400">
                    {new Date(member.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-5 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-bold text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirm}
            disabled={isPending || checkedIds.size === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Clock Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
