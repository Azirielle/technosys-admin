// TicketFinishModal: asks for a short note to the employee before marking a ticket resolved or closed.
// The placeholder is a suggested note made from the ticket; Tab in the empty box types it in.
'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button, Field, Modal, Textarea } from '@/components/ui'
import { ticketRef, type Ticket } from './types'

const COPY = {
  resolved: {
    title: 'Mark this ticket resolved?',
    label: 'Note to the employee',
    suggest: (t: Ticket) => `Your concern "${t.title}" is fixed. Please check it in the app and reply here if something is still wrong.`,
    button: 'Mark resolved',
  },
  closed: {
    title: 'Close this ticket?',
    label: 'Reason for closing',
    suggest: (t: Ticket) => `Closing "${t.title}": there is nothing more HR needs to do. Ask Techy if you need help again.`,
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
  const suggestion = copy.suggest(ticket)

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
      <Field label={copy.label} htmlFor="ticket-finish-note" hint="The employee sees this in the app. Press Tab to use the suggestion.">
        <Textarea id="ticket-finish-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={suggestion}
          onKeyDown={(e) => { if (e.key === 'Tab' && !e.shiftKey && !note.trim()) { e.preventDefault(); setNote(suggestion) } }} />
      </Field>
    </Modal>
  )
}
