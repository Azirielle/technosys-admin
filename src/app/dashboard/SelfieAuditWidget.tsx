"use client"
import { useState, useTransition } from "react"
import { Camera, AlertCircle, RefreshCw, Flag } from "lucide-react"
import { flagSuspiciousSelfie } from "@/app/actions/attendance"

export default function SelfieAuditWidget({ recentSelfies, canApprove = true }: { recentSelfies: any[], canApprove?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticSelfies, setOptimisticSelfies] = useState(recentSelfies)
  const [errorMsg, setErrorMsg] = useState("")

  if (optimisticSelfies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Camera className="w-12 h-12 mb-3 text-slate-300 opacity-50" />
        <p className="text-center">No recent selfies.</p>
      </div>
    );
  }

  const handleFlag = (logId: string) => {
    setErrorMsg("")
    setOptimisticSelfies(prev => prev.filter(s => s.id !== logId))
    
    startTransition(async () => {
      const res = await flagSuspiciousSelfie(logId)
      if (res?.error) {
        setErrorMsg(res.error)
        // Revert on failure (simplified here for UX)
        setOptimisticSelfies(recentSelfies) 
      }
    })
  }

  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-500" />
          Recent DTR Selfies (Audit Log)
          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {optimisticSelfies.length} Auto-Accepted
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
              <div className="p-3">
                <button 
                  onClick={() => handleFlag(selfie.id)}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-1 py-2 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Flag className="w-4 h-4" />
                  Flag Suspicious
                </button>
              </div>
            ) : (
              <div className="p-3 text-center text-sm font-medium text-emerald-600 bg-emerald-50">
                Auto-Accepted
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
