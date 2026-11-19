// LeavesBoard: the HR Leave requests page. Lists requests by status and opens one to approve or decline.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePageCommand } from '@/components/commands/pageCommands'
import { ArrowRight, CalendarOff, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatLeaveDuration, formatTimeAgo } from '@/lib/hr-status'
import { LEAVE_LABELS, REQUEST_STATUS } from '@/lib/labels'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Page,
  PageHeader,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  useToast,
  SkeletonTableRows,
} from '@/components/ui'
import { notifyLeaveDecision } from '@/app/actions/notifications'
import { LeaveReviewModal } from './LeaveReviewModal'
import { LeaveDeclineModal } from './LeaveDeclineModal'
import { applicantName, type LeaveFilter, type LeaveRecord } from './types'

const PER_PAGE = 10

const EMPTY_TEXT: Record<LeaveFilter, string> = {
  pending: 'Every leave request has a decision.',
  approved: 'No approved leave yet.',
  rejected: 'No declined leave.',
  all: 'Technicians file leave from the mobile app. Their requests show up here.',
}

export function LeavesBoard() {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LeaveFilter>('pending')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<LeaveRecord | null>(null)
  const [declining, setDeclining] = useState(false)
  const [saving, setSaving] = useState(false)

  // Quick actions: open a leave request by id once the list has loaded.
  const [pendingId, setPendingId] = useState<string | null>(null)
  usePageCommand(['open'], (_command, id) => id && setPendingId(id))
  if (pendingId && !loading) {
    // Adjusting state while rendering (React's pattern for this): runs once, when the list is ready.
    setPendingId(null)
    const leave = leaves.find((l) => l.id === pendingId)
    if (leave) setSelected(leave)
  }

  const fetchLeaves = useCallback(async () => {
    const { data, error } = await supabase
      .from('leaves')
      .select('*, profiles!technician_id(full_name, role)')
      .order('created_at', { ascending: false })
    if (error) toast.error("Couldn't load leave requests. Refresh the page.")
    else setLeaves((data ?? []) as LeaveRecord[])
    setLoading(false)
  }, [supabase, toast])

  // Load once, then reload whenever a leave changes (a technician files one from the app).
  useEffect(() => {
    fetchLeaves()
    const channel = supabase
      .channel('hr-leaves')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => fetchLeaves())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchLeaves])

  async function setStatus(leave: LeaveRecord, status: 'approved' | 'rejected', rejectionReason?: string) {
    setSaving(true)
    const { error } = await supabase
      .from('leaves')
      .update({
        status,
        rejection_reason: status === 'rejected' ? rejectionReason ?? null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leave.id)
    setSaving(false)
    if (error) {
      toast.error(`Couldn't save the decision: ${error.message}`)
      return
    }
    notifyLeaveDecision(leave.id).catch(() => {}) // push + SMS; a failed message doesn't undo the decision
    toast.success(`${applicantName(leave)}'s leave ${status === 'approved' ? 'approved' : 'declined'}`)
    setDeclining(false)
    setSelected(null)
    fetchLeaves()
  }

  const counts = useMemo(
    () => ({
      pending: leaves.filter((l) => l.status === 'pending').length,
      approved: leaves.filter((l) => l.status === 'approved').length,
      rejected: leaves.filter((l) => l.status === 'rejected').length,
    }),
    [leaves],
  )
  const shown = useMemo(() => (filter === 'all' ? leaves : leaves.filter((l) => l.status === filter)), [leaves, filter])
  const pageRows = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // How many other people are already off (approved or pending) on overlapping days.
  const overlapping = useMemo(() => {
    if (!selected) return 0
    return leaves.filter(
      (o) => o.id !== selected.id && o.status !== 'rejected' && o.start_date <= selected.end_date && o.end_date >= selected.start_date,
    ).length
  }, [selected, leaves])

  return (
    <Page>
      <PageHeader
        title="Leave requests"
        subtitle={
          counts.pending
            ? `${counts.pending} ${counts.pending === 1 ? 'request is' : 'requests are'} waiting for your decision.`
            : 'Nothing is waiting for your decision.'
        }
      />

      <Tabs
        label="Leave status"
        value={filter}
        onChange={(v) => {
          setFilter(v)
          setPage(1)
        }}
        items={[
          { value: 'pending', label: 'Waiting', count: counts.pending },
          { value: 'approved', label: 'Approved', count: counts.approved },
          { value: 'rejected', label: 'Declined', count: counts.rejected },
          { value: 'all', label: 'All', count: leaves.length },
        ]}
      />

      <TableContainer>
        {!loading && shown.length === 0 ? (
          <EmptyState icon={CalendarOff} title="No leave requests here" description={EMPTY_TEXT[filter]} />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Employee</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Dates</TableHeaderCell>
                <TableHeaderCell numeric>Days</TableHeaderCell>
                <TableHeaderCell>Filed</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell align="right">
                  <span className="sr-only">Action</span>
                </TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {loading && (
                <SkeletonTableRows cols={7} />
              )}
              {pageRows.map((leave) => {
                const { dateRangeStr, daysCount } = formatLeaveDuration(leave.start_date, leave.end_date)
                const status = REQUEST_STATUS[leave.status] ?? REQUEST_STATUS.pending
                return (
                  <TableRow key={leave.id} onClick={() => setSelected(leave)}>
                    <TableCell>
                      <span className="flex items-center gap-2.5 font-medium whitespace-nowrap">
                        <Avatar name={applicantName(leave)} size="xs" />
                        {applicantName(leave)}
                      </span>
                    </TableCell>
                    <TableCell className="text-ink-2">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        {LEAVE_LABELS[leave.leave_type] ?? leave.leave_type}
                        {leave.attachment_url && <Paperclip className="size-3.5 text-ink-3" aria-label="Has attachment" />}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{dateRangeStr}</TableCell>
                    <TableCell numeric>{daysCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-ink-2">{formatTimeAgo(leave.created_at)}</TableCell>
                    <TableCell>
                      <Badge tone={status.tone} dot>{status.label}</Badge>
                    </TableCell>
                    <TableCell align="right">
                      <Button size="sm" variant={leave.status === 'pending' ? 'secondary' : 'ghost'} iconRight={ArrowRight}>
                        {leave.status === 'pending' ? 'Review' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {shown.length > PER_PAGE && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(shown.length / PER_PAGE)}
            totalItems={shown.length}
            itemsPerPage={PER_PAGE}
            onPageChange={setPage}
            itemNamePlural="requests"
          />
        )}
      </TableContainer>

      <LeaveReviewModal
        leave={declining ? null : selected}
        overlapping={overlapping}
        saving={saving}
        onClose={() => setSelected(null)}
        onApprove={(leave) => setStatus(leave, 'approved')}
        onDecline={() => setDeclining(true)}
      />
      <LeaveDeclineModal
        leave={declining ? selected : null}
        saving={saving}
        onCancel={() => setDeclining(false)}
        onConfirm={(leave, reason) => setStatus(leave, 'rejected', reason)}
      />
    </Page>
  )
}
