// LeaveDeclineModal: confirms declining a leave request.
'use client'

import { XCircle } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { applicantName, type LeaveRecord } from './types'

export function LeaveDeclineModal({
  leave,
  saving,
  onCancel,
  onConfirm,
}: {
  leave: LeaveRecord | null
  saving: boolean
  onCancel: () => void
  onConfirm: (leave: LeaveRecord) => void
}) {
  if (!leave) return null
  return (
    <Modal
      isOpen
      onClose={onCancel}
      icon={XCircle}
      iconTone="danger"
      title="Decline this leave?"
      subtitle={applicantName(leave)}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={() => onConfirm(leave)} loading={saving}>Decline leave</Button>
        </>
      }
    >
      <p className="text-small text-ink-2">
        {applicantName(leave)} will see the request as declined in the app. Tell them the reason through a ticket or in person.
      </p>
    </Modal>
  )
}
