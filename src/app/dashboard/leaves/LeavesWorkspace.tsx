"use client"

import React, { useState, useTransition } from 'react'
import { LeaveRequest, updateLeaveStatus } from '@/app/actions/leaves'
import { ClipboardList, Calendar, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react'

interface LeavesWorkspaceProps {
  initialLeaves: LeaveRequest[]
  currentUserId: string
}

export default function LeavesWorkspace({ initialLeaves, currentUserId }: LeavesWorkspaceProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [isPending, startTransition] = useTransition()
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAction = async (leaveId: string, status: 'approved' | 'rejected') => {
    setActionLoadingId(leaveId)
    setStatusMsg(null)

    startTransition(async () => {
      const res = await updateLeaveStatus(leaveId, status)
      if (res.success) {
        // Update local state status instantly
        setLeaves(prev =>
          prev.map(item =>
            item.id === leaveId
              ? { ...item, status, updated_at: new Date().toISOString() }
              : item
          )
        )
        setStatusMsg({
          type: 'success',
          text: `Leave request successfully ${status === 'approved' ? 'approved' : 'rejected'}.`
        })
      } else {
        setStatusMsg({
          type: 'error',
          text: res.error || 'Failed to update leave request status.'
        })
      }
      setActionLoadingId(null)
    })
  }

  // Calculate duration in days
  const calculateDays = (startStr: string, endStr: string) => {
    const start = new Date(startStr)
    const end = new Date(endStr)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  // Filter list
  const filteredLeaves = leaves.filter(item => {
    if (filter === 'all') return true
    return item.status === filter
  })

  // Format date range nicely
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Leave Type styling helper
  const getLeaveTypeStyle = (type: LeaveRequest['leave_type']) => {
    switch (type) {
      case 'sick':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'vacation':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'wedding':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'paternal':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'maternal':
        return 'bg-pink-50 text-pink-700 border-pink-200'
      case 'emergency':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'unpaid':
        return 'bg-slate-100 text-slate-700 border-slate-300'
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200'
    }
  }

  // Status style helper
  const getStatusStyle = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800'
      case 'rejected':
        return 'bg-rose-100 text-rose-800'
      case 'pending':
      default:
        return 'bg-amber-100 text-amber-800'
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-emerald-600" />
            Leaves Requests Manager
          </h1>
          <p className="text-slate-500 mt-1">
            Review, approve, and manage leave requests filed by field technicians.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-all duration-200 cursor-pointer ${
              filter === tab
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab}
            {tab === 'pending' && leaves.filter(l => l.status === 'pending').length > 0 && (
              <span className="ml-2 bg-amber-500 text-white rounded-full text-xs px-2 py-0.5 font-bold">
                {leaves.filter(l => l.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Status Messages */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span className="text-sm font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Empty State */}
      {filteredLeaves.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No requests found</h3>
          <p className="text-slate-500 mt-1">There are no leave requests under this category.</p>
        </div>
      ) : (
        /* Requests Grid */
        <div className="grid gap-4 md:grid-cols-2">
          {filteredLeaves.map((leave) => {
            const days = calculateDays(leave.start_date, leave.end_date)
            const isLoading = actionLoadingId === leave.id

            return (
              <div
                key={leave.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                {/* Top header row */}
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {leave.technician?.full_name || 'Technician'}
                      </h3>
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase rounded border ${getLeaveTypeStyle(
                          leave.leave_type
                        )} mt-1`}
                      >
                        {leave.leave_type} Leave
                      </span>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs font-extrabold rounded-full capitalize ${getStatusStyle(
                        leave.status
                      )}`}
                    >
                      {leave.status}
                    </span>
                  </div>

                  {/* Dates section */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium mb-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </span>
                    <span className="text-slate-400 font-normal">|</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">
                      {days} {days === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  {/* Reason comment bubble */}
                  <div className="bg-slate-50 rounded-xl p-3.5 mb-4">
                    <p className="text-sm text-slate-600 italic whitespace-pre-wrap leading-relaxed">
                      “{leave.reason}”
                    </p>
                  </div>
                </div>

                {/* Conflict Warnings */}
                {leave.status === 'pending' && leave.has_conflicts && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl flex items-start gap-2.5 mb-4">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Schedule Conflict Warning
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        This technician has <strong>{leave.conflict_count}</strong> active dispatch schedule(s) during this period. Approving will require reassigning those tasks.
                      </p>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                {leave.status === 'pending' && (
                  <div className="flex gap-2 mt-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleAction(leave.id, 'approved')}
                      disabled={isLoading || isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-sm transition-colors duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        'Approve'
                      )}
                    </button>
                    <button
                      onClick={() => handleAction(leave.id, 'rejected')}
                      disabled={isLoading || isPending}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-sm transition-colors duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        'Reject'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
