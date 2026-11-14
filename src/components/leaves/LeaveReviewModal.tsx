// LeaveReviewModal: one leave request in detail, with a short checklist and the Approve / Decline buttons.
'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, CheckCircle2, ExternalLink, X } from 'lucide-react'
import { formatLeaveDuration, formatTimeAgo } from '@/lib/hr-status'
import { LEAVE_LABELS, REQUEST_STATUS } from '@/lib/labels'
import { Badge, Button, Checkbox, Modal, cx } from '@/components/ui'
import { applicantName, type LeaveRecord } from './types'

export function LeaveReviewModal({
  leave,
  overlapping,
  saving,
  onClose,
  onApprove,
  onDecline,
}: {
  leave: LeaveRecord | null
  /** Other people already off on overlapping days. */
  overlapping: number
  saving: boolean
  onClose: () => void
  onApprove: (leave: LeaveRecord) => void
  onDecline: () => void
}) {
  const [checkedDates, setCheckedDates] = useState(false)
  const [checkedDocs, setCheckedDocs] = useState(false)

  // Fresh checklist for every request.
  useEffect(() => {
    setCheckedDates(false)
    setCheckedDocs(false)
  }, [leave?.id])

  if (!leave) return null
  const { dateRangeStr, daysCount } = formatLeaveDuration(leave.start_date, leave.end_date)
  const status = REQUEST_STATUS[leave.status] ?? REQUEST_STATUS.pending
  const isPending = leave.status === 'pending'

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={CalendarDays}
      title={applicantName(leave)}
      subtitle={`${LEAVE_LABELS[leave.leave_type] ?? leave.leave_type} · ${dateRangeStr} · ${daysCount} ${daysCount === 1 ? 'day' : 'days'}`}
      headerExtra={<Badge tone={status.tone} dot>{status.label}</Badge>}
      maxWidth="md"
      footer={
        isPending ? (
          <>
            <Button variant="ghost" icon={X} onClick={onDecline} disabled={saving}>Decline</Button>
            <Button variant="primary" icon={Check} onClick={() => onApprove(leave)} loading={saving}>Approve leave</Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="text-caption font-medium text-ink-3">Reason</h3>
          <p className="mt-1 whitespace-pre-wrap text-small text-ink">{leave.reason || 'No reason given.'}</p>
          <p className="mt-2 text-caption text-ink-3">Filed {formatTimeAgo(leave.created_at)}</p>
        </section>

        {leave.attachment_url && (
          <a
            href={leave.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-small font-medium text-link hover:underline"
          >
            View attachment (medical certificate) <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}

        <p
          className={cx(
            'flex items-start gap-2 rounded-control p-3 text-small',
            overlapping ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success',
          )}
        >
          {overlapping ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
          {overlapping
            ? `${overlapping} other ${overlapping === 1 ? 'person is' : 'people are'} also on leave on some of these days.`
            : 'No one else is on leave on these days.'}
        </p>

        {isPending && (
          <section className="flex flex-col gap-2">
            <h3 className="text-caption font-medium text-ink-3">Before you decide</h3>
            <Checkbox checked={checkedDates} onChange={(e) => setCheckedDates(e.target.checked)} label="The dates match the schedule" />
            <Checkbox checked={checkedDocs} onChange={(e) => setCheckedDocs(e.target.checked)} label="Supporting documents are complete (if needed)" />
          </section>
        )}
      </div>
    </Modal>
  )
}

