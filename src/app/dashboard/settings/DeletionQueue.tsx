"use client"

import { useState } from "react"
import { Trash2, Archive, XCircle, AlertCircle, Clock } from "lucide-react"
import { processDeletionRequest } from "@/app/actions/crud"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"

export default function DeletionQueue({ deletionRequests }: { deletionRequests: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { alert, confirm } = useAlertConfirm()

  const handleAction = async (requestId: string, recordId: string, tableName: string, action: 'archive' | 'hard_delete' | 'reject') => {
    const actionText = action === 'archive' ? 'Archive' : action === 'hard_delete' ? 'Permanently Delete' : 'Reject'
    const isConfirmed = await confirm(
      `Are you sure you want to ${actionText.toLowerCase()} this record?`,
      `Confirm ${actionText}`,
      action === 'hard_delete' ? 'destructive' : 'default'
    )
    
    if (isConfirmed) {
      setLoadingId(requestId)
      try {
        const result = await processDeletionRequest(requestId, recordId, tableName, action)
        if (result?.error) {
          alert(result.error, "Error", "destructive")
        } else {
          alert(`The request has been ${action === 'hard_delete' ? 'permanently deleted' : action === 'archive' ? 'archived' : 'rejected'}.`, "Success", "success")
        }
      } catch (e: any) {
        alert(e.message, "Error", "destructive")
      } finally {
        setLoadingId(null)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-rose-200 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Trash2 className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Deletion Requests Queue</h2>
              <p className="text-sm text-zinc-500">Review and approve or reject soft-delete requests from administrators.</p>
            </div>
          </div>

          <div className="space-y-4">
            {deletionRequests.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-zinc-900">No pending requests</h3>
                <p className="text-sm text-zinc-500">The deletion queue is currently empty.</p>
              </div>
            ) : (
              deletionRequests.map((req) => (
                <div key={req.id} className="p-5 border border-rose-100 bg-white rounded-xl shadow-sm flex flex-col md:flex-row gap-6 justify-between transition-all hover:border-rose-200">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200">
                        {req.table_name}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(req.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">Reason for Deletion:</h4>
                      <p className="text-sm text-zinc-600 mt-1 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                        "{req.reason}"
                      </p>
                    </div>

                    <div className="text-xs text-zinc-500">
                      <strong>Requested by:</strong> {req.requester?.full_name} ({req.requester?.role})<br/>
                      <strong>Record ID:</strong> <code className="bg-zinc-100 px-1 py-0.5 rounded">{req.record_id}</code>
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-center">
                    <button
                      onClick={() => handleAction(req.id, req.record_id, req.table_name, 'archive')}
                      disabled={loadingId === req.id}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors border border-amber-200"
                    >
                      <Archive className="w-4 h-4" />
                      Archive Only
                    </button>
                    <button
                      onClick={() => handleAction(req.id, req.record_id, req.table_name, 'hard_delete')}
                      disabled={loadingId === req.id}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hard Delete
                    </button>
                    <button
                      onClick={() => handleAction(req.id, req.record_id, req.table_name, 'reject')}
                      disabled={loadingId === req.id}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Request
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
