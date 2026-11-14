// TicketFinishModal: asks for a short note to the employee before marking a ticket resolved or closed.
'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button, Field, Modal, Textarea } from '@/components/ui'
import { ticketRef, type Ticket } from './types'

const COPY = {
  resolved: {
    title: 'Mark this ticket resolved?',
    label: 'Note to the employee',
    placeholder: 'We corrected your time-in for 12 Nov. It now shows 8:02 AM.',
    button: 'Mark resolved',
  },
  closed: {
    title: 'Close this ticket?',
    label: 'Reason for closing',
    placeholder: 'Same concern as ticket #3F2A91C0, which is already answered.',
    button: 'Close ticket',
  },
}

export function TicketFinishModal({
  ticket,
  outcome,
  saving,
  onCancel,
  onConfirm,
}: {
  ticket: Ticket | null
  outcome: 'resolved' | 'closed' | null
  saving: boolean
  onCancel: () => void
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')
  useEffect(() => setNote(''), [outcome, ticket?.id])
  if (!ticket || !outcome) return null
  const copy = COPY[outcome]

  return (
    <Modal
      isOpen
      onClose={onCancel}
      icon={outcome === 'resolved' ? CheckCircle2 : XCircle}
      iconTone={outcome === 'resolved' ? 'success' : 'neutral'}
      title={copy.title}
      subtitle={`${ticketRef(ticket)} · ${ticket.title}`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={() => onConfirm(note)}>{copy.button}</Button>
        </>
      }
    >
      <Field label={copy.label} htmlFor="ticket-finish-note" hint="The employee sees this in the app.">
        <Textarea id="ticket-finish-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={copy.placeholder} />
      </Field>
    </Modal>
  )
}
