"use client"
import { useState, useTransition } from "react"
import { reviewOtRequest } from "@/app/actions/overtime"
import { Check, X, Calendar, Clock, User, AlertCircle, Sparkles } from "lucide-react"

export default function OvertimeRequestsTable({ 
  requests, 
  adminId, 
  canApprove 
}: { 
  requests: any[]
  adminId: string
  canApprove: boolean 
}) {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleReview = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!adminId) {
      setErrorMessage("No active administrator session.")
      return
    }

    setErrorMessage(null)
    startTransition(async () => {
      const res = await reviewOtRequest(requestId, status, adminId)
      if (res?.error) {
        setErrorMessage(res.error)
      }
    })
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200">
        <Sparkles className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-center font-medium">No overtime requests filed yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Technician</th>
                <th className="px-6 py-4 font-semibold">Request Date</th>
                <th className="px-6 py-4 font-semibold">OT Hours</th>
                <th className="px-6 py-4 font-semibold">Reason / Justification</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Reviewed By</th>
                {canApprove && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => {
                const techName = req.technician?.full_name || 'Unknown'
                const reviewerName = req.reviewer?.full_name || '-'
                
                let badgeClass = "bg-amber-100 text-amber-700"
                if (req.status === 'approved') badgeClass = "bg-emerald-100 text-emerald-700"
                if (req.status === 'rejected') badgeClass = "bg-rose-100 text-rose-700"

                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {req.technician?.avatar_url ? (
                          <img 
                            src={req.technician.avatar_url} 
                            alt={techName} 
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {techName.charAt(0)}
                          </div>
                        )}
                        <span className="font-semibold text-slate-900">{techName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(req.request_date).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-950 font-bold">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {req.requested_hours} hrs
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-xs font-semibold uppercase tracking-wider ${badgeClass}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{reviewerName}</td>
                    {canApprove && (
                      <td className="px-6 py-4 text-right">
                        {req.status === 'pending' ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleReview(req.id, 'approved')}
                              disabled={isPending}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors border border-emerald-200"
                              title="Approve Overtime"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReview(req.id, 'rejected')}
                              disabled={isPending}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors border border-rose-200"
                              title="Reject Overtime"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
