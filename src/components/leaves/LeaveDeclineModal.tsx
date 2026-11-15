// LeaveDeclineModal: asks HR why a leave is being declined, then declines it with that reason.
'use client'

import { useState } from 'react'
import { XCircle } from 'lucide-react'
import { Button, Field, Modal, Textarea } from '@/components/ui'
import { applicantName, type LeaveRecord } from './types'

const MIN_LENGTH = 5

export function LeaveDeclineModal({
  leave,
  saving,
  onCancel,
  onConfirm,
}: {
  leave: LeaveRecord | null
  saving: boolean
  onCancel: () => void
  onConfirm: (leave: LeaveRecord, reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)

  // Start with an empty reason for every request (reset while rendering when a different leave opens).
  const [shownId, setShownId] = useState(leave?.id)
  if (shownId !== leave?.id) {
    setShownId(leave?.id)
    setReason('')
    setTried(false)
  }

  if (!leave) return null
  const trimmed = reason.trim()
  const tooShort = trimmed.length < MIN_LENGTH

  function submit() {
    setTried(true)
    if (!leave || tooShort) return
    onConfirm(leave, trimmed)
  }

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
          <Button variant="danger" onClick={submit} loading={saving}>Decline leave</Button>
        </>
      }
    >
      <Field
        label="Why are you declining it?"
        htmlFor="leave-decline-reason"
        required
        hint={`${applicantName(leave)} will see this reason in the app. Ctrl Enter to decline.`}
        error={tried && tooShort ? 'Write a short reason (at least 5 characters).' : undefined}
      >
        <Textarea
          id="leave-decline-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          // Ctrl Enter declines without reaching for the mouse (plain Enter adds a new line).
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="For example: Two other technicians are already on leave that week."
          invalid={tried && tooShort}
          maxLength={500}
          autoFocus
        />
      </Field>
    </Modal>
  )
}
