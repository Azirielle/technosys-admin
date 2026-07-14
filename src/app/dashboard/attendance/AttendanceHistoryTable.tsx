"use client"
import { useState } from "react"
import { CheckCircle2, XCircle, Camera, Edit2 } from "lucide-react"
import AttendanceEditModal from "./AttendanceEditModal"

export default function AttendanceHistoryTable({ history, canEdit }: { history: any[], canEdit?: boolean }) {
  const [editingRecord, setEditingRecord] = useState<any>(null)
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200">
        <CheckCircle2 className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-center font-medium">No review history available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Technician</th>
              <th className="px-6 py-4 font-semibold">DTR Date & Time</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Reviewed By</th>
              <th className="px-6 py-4 font-semibold">Review Time</th>
              <th className="px-6 py-4 font-semibold text-center">Photo</th>
              {canEdit && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((record) => {
              const techName = Array.isArray(record.technician) ? record.technician[0]?.full_name : record.technician?.full_name || 'Unknown';
              const reviewerName = Array.isArray(record.reviewer) ? record.reviewer[0]?.full_name : record.reviewer?.full_name || 'System';

              return (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{techName}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(record.app_time_in).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {record.photo_status === 'approved' ? (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{reviewerName}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {record.reviewed_at ? new Date(record.reviewed_at).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 flex justify-center">
                    <a 
                      href={record.photo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Selfie"
                    >
                      <Camera className="w-5 h-5" />
                    </a>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Record"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editingRecord && (
        <AttendanceEditModal 
          record={editingRecord} 
          onClose={() => setEditingRecord(null)} 
        />
      )}
    </div>
  )
}
