'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  CalendarOff,
  User,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import ModalDialog from '@/components/ui/ModalDialog'
import Pagination from '@/components/ui/Pagination'
import {
  getLeaveStatusInfo,
  formatLeaveDuration,
  formatTimeAgo,
} from '@/lib/hr-status'

export type LeaveRecord = {
  id: string
  technician_id?: string
  start_date: string
  end_date: string
  leave_type: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  rejection_reason?: string | null
  profiles?: {
    full_name?: string
    role?: string
  }
}

export function LeavesTab() {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Selected leave for review modal (Image 3)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null)

  // Checklist state for Image 3
  const [checklistBalance, setChecklistBalance] = useState(false)
  const [checklistDocs, setChecklistDocs] = useState(false)

  // Rejection modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchLeaves()

    // Real-time listener for instant leave synchronization
    const channel = supabase
      .channel('hr-leaves-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => {
          fetchLeaves(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchLeaves = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*, profiles!technician_id(full_name, role)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setLeaves(data as LeaveRecord[])
    } catch (err) {
      console.error('Error fetching leaves:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Handle direct approval
  const handleApprove = async (leave: LeaveRecord) => {
    try {
      setIsUpdatingStatus(true)
      const { error } = await supabase
        .from('leaves')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', leave.id)

      if (error) throw error

      setToastMessage({
        text: `Leave request for ${leave.profiles?.full_name || 'Technician'} approved.`,
        type: 'success',
      })
      setTimeout(() => setToastMessage(null), 4000)

      setSelectedLeave(null)
      setChecklistBalance(false)
      setChecklistDocs(false)
      fetchLeaves(true)
    } catch (err: any) {
      alert(`Failed to approve leave: ${err.message || 'Unknown error'}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle decline confirmation
  const confirmDecline = async () => {
    if (!selectedLeave) return
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining this request.')
      return
    }

    try {
      setIsUpdatingStatus(true)
      const { error } = await supabase
        .from('leaves')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLeave.id)

      if (error) throw error

      setShowDeclineModal(false)
      setSelectedLeave(null)
      setChecklistBalance(false)
      setChecklistDocs(false)

      setToastMessage({
        text: `Leave request for ${selectedLeave.profiles?.full_name || 'Technician'} declined.`,
        type: 'danger',
      })
      setTimeout(() => setToastMessage(null), 4000)

      fetchLeaves(true)
    } catch (err: any) {
      alert(`Failed to decline leave: ${err.message || 'Unknown error'}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Metric counts
  const pendingCount = useMemo(() => leaves.filter((l) => l.status === 'pending').length, [leaves])
  const approvedCount = useMemo(() => leaves.filter((l) => l.status === 'approved').length, [leaves])
  const rejectedCount = useMemo(() => leaves.filter((l) => l.status === 'rejected').length, [leaves])

  // Filtered requests
  const filteredLeaves = useMemo(() => {
    if (activeFilter === 'all') return leaves
    return leaves.filter((l) => l.status === activeFilter)
  }, [leaves, activeFilter])

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage)
  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredLeaves.slice(start, start + itemsPerPage)
  }, [filteredLeaves, currentPage, itemsPerPage])

  // Coverage conflict calculation
  const coverageConflicts = useMemo(() => {
    if (!selectedLeave) return 0
    const start = new Date(selectedLeave.start_date).getTime()
    const end = new Date(selectedLeave.end_date).getTime()

    return leaves.filter((other) => {
      if (other.id === selectedLeave.id) return false
      if (other.status !== 'approved' && other.status !== 'pending') return false
      const otherStart = new Date(other.start_date).getTime()
      const otherEnd = new Date(other.end_date).getTime()
      return start <= otherEnd && end >= otherStart
    }).length
  }, [selectedLeave, leaves])

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF9FB] dark:bg-[#121215] text-[#121215] dark:text-[#F4F4F6] overflow-y-auto select-none transition-colors duration-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#15271F] text-emerald-300 border-emerald-500/30'
              : 'bg-[#29171C] text-rose-300 border-rose-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Top Header Lockup (Matching Image 2) */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
              Leave Management
            </h1>
            <p className="text-xs sm:text-sm text-[#575762] dark:text-[#B0B2BD]">
              Review employee leave requests and manage decisions.
            </p>
          </div>

          <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#575762] dark:text-[#B0B2BD] shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Needs Your Review Summary Block (Matching Image 2) */}
        <div className="space-y-3">
          <div>
            <span className="text-xs font-bold text-[#7A7C88] dark:text-[#8E8D9A] block">
              Needs your review
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
                {pendingCount} {pendingCount === 1 ? 'request' : 'requests'}
              </span>
            </div>
            <span className="text-xs text-[#575762] dark:text-[#8E8D9A]">
              Requests awaiting HR action
            </span>
          </div>

          {/* Interactive Metric Cards acting as filters (Hick's Law & Gestalt Proximity) */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            {/* Card 1: Pending */}
            <button
              type="button"
              onClick={() => {
                setActiveFilter('pending')
                setCurrentPage(1)
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                activeFilter === 'pending'
                  ? 'bg-[#EEEDF8] dark:bg-[#1E1F2C] border-[#4D55CC]/40 ring-1 ring-[#4D55CC]/30 shadow-xs'
                  : 'bg-[#F7F6F9] dark:bg-[#1A1B23] border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.14]'
              }`}
            >
              <span className="text-xs font-bold text-[#575762] dark:text-[#8E8D9A] block mb-1">
                Pending
              </span>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#121215] dark:text-[#F4F4F6]">
                {pendingCount}
              </span>
            </button>

            {/* Card 2: Approved */}
            <button
              type="button"
              onClick={() => {
                setActiveFilter('approved')
                setCurrentPage(1)
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                activeFilter === 'approved'
                  ? 'bg-[#EBF7F0] dark:bg-[#18261E] border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-xs'
                  : 'bg-[#F7F6F9] dark:bg-[#1A1B23] border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.14]'
              }`}
            >
              <span className="text-xs font-bold text-[#575762] dark:text-[#8E8D9A] block mb-1">
                Approved
              </span>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#121215] dark:text-[#F4F4F6]">
                {approvedCount}
              </span>
            </button>

            {/* Card 3: Rejected */}
            <button
              type="button"
              onClick={() => {
                setActiveFilter('rejected')
                setCurrentPage(1)
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                activeFilter === 'rejected'
                  ? 'bg-[#FDF0F3] dark:bg-[#2A181C] border-rose-500/40 ring-1 ring-rose-500/30 shadow-xs'
                  : 'bg-[#F7F6F9] dark:bg-[#1A1B23] border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.14]'
              }`}
            >
              <span className="text-xs font-bold text-[#575762] dark:text-[#8E8D9A] block mb-1">
                Rejected
              </span>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#121215] dark:text-[#F4F4F6]">
                {rejectedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Requests Section Header & View All (Matching Image 2) */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-[#121215] dark:text-[#F4F4F6]">
              {activeFilter === 'pending'
                ? 'Requests requiring action'
                : activeFilter === 'approved'
                ? 'Approved leave records'
                : activeFilter === 'rejected'
                ? 'Rejected leave records'
                : 'All leave applications'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setActiveFilter((prev) => (prev === 'all' ? 'pending' : 'all'))
                setCurrentPage(1)
              }}
              className="text-xs font-bold text-[#4D55CC] hover:underline cursor-pointer"
            >
              {activeFilter === 'all' ? 'Show pending only' : 'View all'}
            </button>
          </div>

          {/* Request Card Stream (Matching Image 2 layout) */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-[#8E8D9A]">
              <Loader2 className="w-5 h-5 animate-spin text-[#4D55CC]" />
              <span className="text-xs">Loading requests...</span>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="py-16 rounded-2xl bg-[#F7F6F9] dark:bg-[#1A1B23] border border-black/[0.06] dark:border-white/[0.08] flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center text-[#8E8D9A] mb-3">
                <CalendarOff className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#121215] dark:text-[#F4F4F6] mb-1">
                No requests under this category
              </h4>
              <p className="text-xs text-[#7A7C88] max-w-xs">
                {activeFilter === 'pending'
                  ? 'All pending employee leave applications have been reviewed.'
                  : 'No records match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedLeaves.map((leave) => {
                const statusInfo = getLeaveStatusInfo(leave.status)
                const { dateRangeStr, daysCount } = formatLeaveDuration(leave.start_date, leave.end_date)
                const timeAgo = formatTimeAgo(leave.created_at)
                const applicantName = leave.profiles?.full_name || 'Technician Employee'

                return (
                  <div
                    key={leave.id}
                    className="rounded-2xl p-4 sm:p-5 bg-[#F7F6F9] dark:bg-[#1A1B23] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col gap-3"
                  >
                    {/* Header Row: User Avatar, Name, and Status Badge (Image 2) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#EBEAEF] dark:bg-[#282935] flex items-center justify-center text-[#575762] dark:text-[#B0B2BD] shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-extrabold text-[#121215] dark:text-[#F4F4F6] truncate">
                            {applicantName}
                          </span>
                          <span className="text-xs text-[#575762] dark:text-[#B0B2BD] capitalize truncate">
                            {leave.leave_type} leave · {dateRangeStr}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge (Matching Image 2 / Image 4) */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${statusInfo.bgClass} ${statusInfo.textClass} ${statusInfo.borderClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Subtitle Line (Image 2) */}
                    <div className="text-xs text-[#7A7C88] dark:text-[#8E8D9A]">
                      Submitted {timeAgo} · {daysCount} working {daysCount === 1 ? 'day' : 'days'} requested
                    </div>

                    {/* Single Primary Action Button: "Review request →" (Hick's Law - Image 2) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeave(leave)
                        setChecklistBalance(false)
                        setChecklistDocs(false)
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#EBEAEF] dark:bg-[#2B2C37] hover:bg-black/[0.08] dark:hover:bg-white/[0.09] text-[#121215] dark:text-[#F4F4F6] border border-black/[0.05] dark:border-white/[0.08] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Review request</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-2 pb-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredLeaves.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                itemNamePlural="leave requests"
              />
            </div>
          )}
        </div>
      </div>

      {/* Leave Request Details Modal (Matching Image 3 exactly) */}
      {selectedLeave && !showDeclineModal && (
        <ModalDialog
          isOpen={!!selectedLeave}
          onClose={() => {
            setSelectedLeave(null)
            setChecklistBalance(false)
            setChecklistDocs(false)
          }}
          title="Leave Request Details"
          maxWidth="md"
        >
          <div className="space-y-5 text-xs text-[#121215] dark:text-[#F4F4F6]">
            {/* Header: Name + Pending Approval Badge (Image 3) */}
            <div className="flex items-start justify-between gap-3 border-b border-black/[0.05] dark:border-white/[0.07] pb-3">
              <div className="flex flex-col">
                <h3 className="text-base font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                  {selectedLeave.profiles?.full_name || 'Technician Employee'}
                </h3>
                <span className="text-xs text-[#575762] dark:text-[#B0B2BD] capitalize mt-0.5">
                  {selectedLeave.leave_type} leave · {formatLeaveDuration(selectedLeave.start_date, selectedLeave.end_date).dateRangeStr}
                </span>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                  getLeaveStatusInfo(selectedLeave.status).bgClass
                } ${getLeaveStatusInfo(selectedLeave.status).textClass} ${
                  getLeaveStatusInfo(selectedLeave.status).borderClass
                }`}
              >
                {getLeaveStatusInfo(selectedLeave.status).label}
              </span>
            </div>

            {/* Reason for Leave Section (Image 3) */}
            <div className="space-y-1">
              <span className="font-extrabold text-xs text-[#121215] dark:text-[#F4F4F6] block">
                Reason for leave
              </span>
              <p className="text-xs text-[#575762] dark:text-[#B0B2BD] leading-relaxed whitespace-pre-wrap">
                {selectedLeave.reason || 'Personal vacation.'}
              </p>
            </div>

            {/* HR Review Checklist (Matching Image 3) */}
            <div className="space-y-2.5 pt-1">
              <span className="font-extrabold text-xs text-[#121215] dark:text-[#F4F4F6] block">
                HR review checklist
              </span>

              <div className="space-y-2">
                {/* Checklist Item 1 */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklistBalance}
                    onChange={(e) => setChecklistBalance(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-[#4D55CC] cursor-pointer"
                  />
                  <span className="text-xs text-[#575762] dark:text-[#B0B2BD]">
                    Check available leave balance
                  </span>
                </label>

                {/* Checklist Item 2 */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklistDocs}
                    onChange={(e) => setChecklistDocs(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-[#4D55CC] cursor-pointer"
                  />
                  <span className="text-xs text-[#575762] dark:text-[#B0B2BD]">
                    Verify dates and supporting documents
                  </span>
                </label>
              </div>

              {/* Coverage Telemetry */}
              <div
                className={`mt-2 p-2.5 rounded-xl border flex items-center gap-2 text-[11px] ${
                  coverageConflicts > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {coverageConflicts > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {coverageConflicts > 0
                    ? `Warning: ${coverageConflicts} other team member(s) also on leave during this period.`
                    : 'Full department shift coverage confirmed.'}
                </span>
              </div>
            </div>

            {/* Action Buttons (Hick's Law & Visual Hierarchy - Matching Image 3) */}
            {selectedLeave.status === 'pending' ? (
              <div className="flex items-center gap-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.07]">
                {/* Primary Button: Approve request */}
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleApprove(selectedLeave)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#FAF9FB] dark:bg-[#F4F4F6] text-[#121215] hover:bg-black/[0.08] dark:hover:bg-white/90 shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-black/[0.1]"
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Approve request
                </button>

                {/* Secondary Button: Reject */}
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => setShowDeclineModal(true)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#EBEAEF] dark:bg-[#1E1F27] text-[#121215] dark:text-[#F4F4F6] hover:bg-rose-500/15 hover:text-rose-600 border border-black/[0.08] dark:border-white/[0.1] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] text-center text-xs font-semibold text-[#7A7C88] border border-black/[0.05] dark:border-white/[0.07]">
                Decision finalized as {selectedLeave.status.toUpperCase()}
              </div>
            )}
          </div>
        </ModalDialog>
      )}

      {/* Mandatory Rejection Reason Dialog */}
      {showDeclineModal && selectedLeave && (
        <ModalDialog
          isOpen={showDeclineModal}
          onClose={() => setShowDeclineModal(false)}
          title="Decline Leave Application"
          subtitle={`Providing clear justification for ${selectedLeave.profiles?.full_name || 'the employee'}`}
          icon={XCircle}
          iconVariant="rose"
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#EBEAEF] dark:bg-[#282935] text-[#121215] dark:text-[#F4F4F6] hover:bg-black/[0.08] dark:hover:bg-white/[0.09] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || !declineReason.trim()}
                onClick={confirmDecline}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-[#FAF9FB] shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Confirm Decline
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-[#575762] dark:text-[#B0B2BD] leading-relaxed">
              To maintain audit compliance, please record the reason why this application cannot be granted at this time (e.g. shift staffing shortage, insufficient leave balance).
            </p>
            <textarea
              rows={3}
              placeholder="Enter official reason for declining..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.08] dark:border-white/[0.1] text-xs text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] focus:outline-hidden focus:ring-2 focus:ring-rose-500 leading-relaxed"
            />
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
