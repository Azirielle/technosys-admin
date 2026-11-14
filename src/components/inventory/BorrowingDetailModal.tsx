// BorrowingDetailModal: one borrowing in full — tool, person, dates, condition, fee and notes.
'use client'

import { Wrench } from 'lucide-react'
import { formatDay, formatTime } from '@/lib/format'
import { Badge, Button, Modal } from '@/components/ui'
import { BORROW_STATUS, CONDITIONS, daysOut, isOverdue, peso, type Borrowing } from './types'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-small text-ink-2">{label}</dt>
      <dd className="text-right text-small text-ink">{children}</dd>
    </div>
  )
}

function when(iso: string) {
  return `${formatDay(iso)}, ${formatTime(iso)}`
}

export function BorrowingDetailModal({
  borrowing,
  onClose,
  onReturn,
}: {
  borrowing: Borrowing | null
  onClose: () => void
  onReturn: (b: Borrowing) => void
}) {
  if (!borrowing) return null
  const status = BORROW_STATUS[borrowing.status]
  const condition = CONDITIONS.find((c) => c.value === borrowing.condition_on_return)

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={Wrench}
      title={borrowing.tool_catalog?.name || 'Borrowed tool'}
      subtitle={borrowing.tool_catalog?.serial_number || undefined}
      headerExtra={isOverdue(borrowing) ? <Badge tone="danger" dot>Overdue</Badge> : <Badge tone={status.tone} dot>{status.label}</Badge>}
      maxWidth="md"
      footer={
        borrowing.status === 'checked_out' ? (
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => onReturn(borrowing)}>Check in</Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <dl className="divide-y divide-line">
        <Row label="Borrowed by">{borrowing.profiles?.full_name || 'Staff'}</Row>
        <Row label="How many">{borrowing.quantity}</Row>
        <Row label="Handed over">{when(borrowing.handed_over_at)}</Row>
        <Row label="Returned">{borrowing.returned_at ? when(borrowing.returned_at) : `Not yet (${daysOut(borrowing)} days)`}</Row>
        {condition && <Row label="Condition">{condition.label}</Row>}
        {borrowing.damage_fee > 0 && <Row label="Charge">{peso(borrowing.damage_fee)}</Row>}
      </dl>
      {(borrowing.notes || borrowing.condition_notes) && (
        <div className="mt-3 flex flex-col gap-2 rounded-control bg-surface-soft p-3 text-small">
          {borrowing.notes && <p><span className="text-ink-3">When lent: </span>{borrowing.notes}</p>}
          {borrowing.condition_notes && <p><span className="text-ink-3">When returned: </span>{borrowing.condition_notes}</p>}
        </div>
      )}
    </Modal>
  )
}
