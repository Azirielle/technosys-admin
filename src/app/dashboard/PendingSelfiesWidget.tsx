"use client"
import { useState, useTransition } from "react"
import { Camera, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { processSelfieApproval } from "@/app/actions/attendance"

export default function PendingSelfiesWidget({ pendingSelfies, canApprove = true }: { pendingSelfies: any[], canApprove?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticSelfies, setOptimisticSelfies] = useState(pendingSelfies)
  const [errorMsg, setErrorMsg] = useState("")

  if (optimisticSelfies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500 opacity-50" />
        <p className="text-center">No pending selfies.</p>
      </div>
    );
  }

  const handleApprove = (logId: string, status: 'approved' | 'rejected') => {
    setErrorMsg("")
    setOptimisticSelfies(prev => prev.filter(s => s.id !== logId))
    
    startTransition(async () => {
      const res = await processSelfieApproval(logId, status)
      if (res?.error) {
        setErrorMsg(res.error)
        // Revert on failure (simplified here for UX)
        setOptimisticSelfies(pendingSelfies) 
      }
    })
  }

  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-500" />
          Pending DTR Selfie Approvals
          <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {optimisticSelfies.length} Action Required
          </span>
        </h2>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {optimisticSelfies.map(selfie => (
          <div key={selfie.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-[3/4] bg-slate-100 relative flex items-center justify-center">
              {selfie.photo_url ? (
                <img 
                  src={selfie.photo_url} 
                  alt="Attendance Selfie" 
                  className="w-full h-full object-cover"
                  onError={(e) => { 
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('fallback-icon');
                  }}
                />
              ) : (
                <Camera className="w-12 h-12 text-slate-300" />
              )}
              <style jsx>{`
                .fallback-icon::after {
                  content: '📸';
                  font-size: 3rem;
                  position: absolute;
                }
              `}</style>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                <p className="text-white font-bold truncate">
                  {selfie.technician?.full_name || 'Unknown'}
                </p>
                <p className="text-white/80 text-xs">
                  {new Date(selfie.app_time_in).toLocaleString()}
                </p>
              </div>
            </div>
            
            {canApprove ? (
              <div className="p-3 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleApprove(selfie.id, 'rejected')}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1 py-2 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button 
                  onClick={() => handleApprove(selfie.id, 'approved')}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1 py-2 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
              </div>
            ) : (
              <div className="p-3 text-center text-sm font-medium text-slate-500 bg-slate-50">
                Pending Approval
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
