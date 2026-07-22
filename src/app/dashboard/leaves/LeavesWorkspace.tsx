"use client"

import React, { useState, useTransition } from 'react'
import { LeaveRequest, updateLeaveStatus } from '@/app/actions/leaves'
import { ClipboardList, CalendarDays, CheckCircle2, XCircle, Clock, RefreshCw, Siren, Heart, Compass, Baby, DollarSign, ShieldAlert, Sparkles } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import { useAlertConfirm } from '@/components/ui/AlertConfirmProvider'

interface LeavesWorkspaceProps {
  initialLeaves: LeaveRequest[]
  currentUserId: string
  isWriteAllowed?: boolean
}

export default function LeavesWorkspace({ initialLeaves, currentUserId, isWriteAllowed = false }: LeavesWorkspaceProps) {
  const { alert, confirm } = useAlertConfirm()
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
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

  // Summary calculations
  const pendingCount = leaves.filter(l => l.status === 'pending').length

  const todayStr = new Date().toISOString().substring(0, 10)
  const activeLeavesToday = leaves.filter(l => {
    if (l.status !== 'approved') return false
    return todayStr >= l.start_date && todayStr <= l.end_date
  }).length

  const thisMonthStr = new Date().toISOString().substring(0, 7)
  const approvedThisMonth = leaves.filter(l => {
    if (l.status !== 'approved') return false
    return l.start_date.substring(0, 7) === thisMonthStr || l.end_date.substring(0, 7) === thisMonthStr
  }).length

  const approvedLeaves = leaves.filter(l => l.status === 'approved')
  const typeCounts = approvedLeaves.reduce((acc, l) => {
    acc[l.leave_type] = (acc[l.leave_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  let mostCommonType = 'None'
  let maxCount = 0
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      maxCount = count
      mostCommonType = type.charAt(0).toUpperCase() + type.slice(1)
    }
  })
  const mostCommonTypeStr = mostCommonType === 'None' ? 'N/A' : `${mostCommonType} (${maxCount})`

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

  const totalItems = filteredLeaves.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Format date range nicely
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

      {/* Real-time Leaves Status Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <p className="text-2xs font-extrabold uppercase tracking-wider text-zinc-400">Pending Approval</p>
          <p className="text-3xl font-extrabold text-zinc-900 mt-2">{pendingCount}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-2xs text-zinc-500 font-semibold">Awaiting supervisor review</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <p className="text-2xs font-extrabold uppercase tracking-wider text-zinc-400">Active Leaves Today</p>
          <p className="text-3xl font-extrabold text-zinc-900 mt-2">{activeLeavesToday}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-2xs text-zinc-500 font-semibold">Out of office today</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <p className="text-2xs font-extrabold uppercase tracking-wider text-zinc-400">Approved This Month</p>
          <p className="text-3xl font-extrabold text-zinc-900 mt-2">{approvedThisMonth}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-2xs text-zinc-500 font-semibold">Approved this month</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <p className="text-2xs font-extrabold uppercase tracking-wider text-zinc-400">Common Reason</p>
          <p className="text-lg font-extrabold text-zinc-850 mt-3 truncate">{mostCommonTypeStr}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span className="text-2xs text-zinc-500 font-semibold">Leading leave type</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-zinc-100 p-1 rounded-xl flex gap-1 mb-8 max-w-md">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => {
          const isActive = filter === tab
          const count = tab === 'all' 
            ? leaves.length 
            : leaves.filter(l => l.status === tab).length

          return (
            <button
              key={tab}
              onClick={() => {
                setFilter(tab)
                setCurrentPage(1)
              }}
              className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-white text-zinc-950 shadow-xs animate-smooth-fade'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <span>{tab}</span>
              {count > 0 && (
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                  isActive
                    ? 'bg-zinc-950 border-zinc-950 text-white'
                    : tab === 'pending'
                    ? 'bg-amber-100 border-amber-200 text-amber-800'
                    : tab === 'approved'
                    ? 'bg-emerald-100 border-emerald-250 text-emerald-800'
                    : 'bg-zinc-200 border-zinc-300 text-zinc-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
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
        <div className="bg-white rounded-2xl border border-zinc-200 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-7 h-7 text-zinc-400" />
          </div>
          <h3 className="text-base font-bold text-zinc-800">No requests found</h3>
          <p className="text-zinc-400 mt-1.5 text-sm">There are no leave requests under this category.</p>
        </div>
      ) : (
        /* Requests Grid */
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedLeaves.map((leave) => {
              const days = calculateDays(leave.start_date, leave.end_date)
              const isLoading = actionLoadingId === leave.id

              // Per-type icon + accent color config
              const typeConfig: Record<string, { icon: React.ReactNode; accent: string; badge: string }> = {
                sick:      { icon: <Heart className="w-4 h-4" />,        accent: 'border-l-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
                vacation:  { icon: <Compass className="w-4 h-4" />,      accent: 'border-l-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                wedding:   { icon: <Sparkles className="w-4 h-4" />,     accent: 'border-l-indigo-400',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                paternal:  { icon: <Baby className="w-4 h-4" />,         accent: 'border-l-cyan-400',    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
                maternal:  { icon: <Baby className="w-4 h-4" />,         accent: 'border-l-pink-400',    badge: 'bg-pink-50 text-pink-700 border-pink-200' },
                emergency: { icon: <Siren className="w-4 h-4" />,        accent: 'border-l-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
                unpaid:    { icon: <DollarSign className="w-4 h-4" />,   accent: 'border-l-zinc-400',    badge: 'bg-zinc-100 text-zinc-600 border-zinc-300' },
              }
              const cfg = typeConfig[leave.leave_type] ?? { icon: <CalendarDays className="w-4 h-4" />, accent: 'border-l-zinc-300', badge: 'bg-zinc-100 text-zinc-600 border-zinc-200' }

              const statusPill: Record<string, string> = {
                approved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
                rejected: 'bg-rose-100 text-rose-800 border border-rose-200',
                pending:  'bg-amber-100 text-amber-800 border border-amber-200',
              }

              return (
                <div
                  key={leave.id}
                  className={`bg-white rounded-2xl border border-zinc-200 border-l-4 ${cfg.accent} flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden`}
                >
                  {/* Card Body */}
                  <div className="p-5">
                    {/* Header row — name + status pill */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-zinc-900 truncate">
                          {leave.technician?.full_name || 'Technician'}
                        </p>
                        {/* Type badge with icon */}
                        <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${cfg.badge}`}>
                          {cfg.icon}
                          {leave.leave_type} Leave
                        </span>
                      </div>
                      <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full capitalize ${statusPill[leave.status] ?? statusPill.pending}`}>
                        {leave.status}
                      </span>
                    </div>

                    {/* Date + duration chip row */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                        <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{formatDate(leave.start_date)}</span>
                        <span className="text-zinc-300">→</span>
                        <span>{formatDate(leave.end_date)}</span>
                      </div>
                      <span className="ml-auto shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-950 text-white">
                        {days}d
                      </span>
                    </div>

                    {/* Reason bubble */}
                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-3.5 py-3 mb-3">
                      <p className="text-xs text-zinc-500 italic leading-relaxed line-clamp-3">
                        "{leave.reason}"
                      </p>
                    </div>

                    {/* Conflict Warning block */}
                    {leave.status === 'pending' && leave.has_conflicts && (
                      <div className="border-l-4 border-l-amber-400 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                            Schedule Conflict — {leave.conflict_count} dispatch{(leave.conflict_count ?? 0) > 1 ? 'es' : ''}
                          </p>
                          <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                            Approving will automatically unassign this technician from all overlapping dispatches.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Actions footer */}
                  {leave.status === 'pending' && isWriteAllowed && (
                    <div className="flex gap-2 px-5 pb-5 pt-0">
                      <button
                        onClick={async () => {
                          const ok = await confirm(
                            leave.has_conflicts
                              ? `Approve leave for ${leave.technician?.full_name ?? 'this technician'}?\n\n⚠️ This will auto-unassign ${leave.conflict_count} conflicting dispatch(es).`
                              : `Approve leave for ${leave.technician?.full_name ?? 'this technician'}?`,
                            'Confirm Approval'
                          )
                          if (ok) handleAction(leave.id, 'approved')
                        }}
                        disabled={isLoading || isPending}
                        className="flex-1 bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-2 rounded-xl text-xs transition-colors duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm(
                            `Reject leave request for ${leave.technician?.full_name ?? 'this technician'}? This action cannot be undone.`,
                            'Confirm Rejection',
                            'destructive'
                          )
                          if (ok) handleAction(leave.id, 'rejected')
                        }}
                        disabled={isLoading || isPending}
                        className="flex-1 bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-300 text-zinc-700 hover:text-rose-700 font-bold py-2 rounded-xl text-xs transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            itemNamePlural="leave requests"
          />
        </div>
      )}
    </div>
  )
}
