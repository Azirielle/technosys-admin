// CancelJobModal: cancel a job with a reason (a common one from the list, or your own words).
'use client'

import { useEffect, useState } from 'react'
import { CalendarX2 } from 'lucide-react'
import { cancelSchedule } from '@/app/actions/schedules'
import { Button, Field, Modal, Select, Textarea } from '@/components/ui'
import type { ScheduleItem } from './types'

const REASONS = [
  'Client moved the date',
  'Bad weather or flooding',
  "Can't get into the site",
  'Parts or materials not available',
  'Technician emergency',
  'Other',
].map((r) => ({ value: r, label: r }))

export function CancelJobModal({ job, onClose, onDone }: { job: ScheduleItem | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReason('')
    setNotes('')
    setError(null)
  }, [job?.id])

  if (!job) return null

  async function save() {
    if (!job) return
    const finalReason = reason === 'Other' ? notes.trim() : notes.trim() ? `${reason}: ${notes.trim()}` : reason
    if (!finalReason) return setError(reason === 'Other' ? 'Write the reason.' : 'Choose a reason.')
    setSaving(true)
    const res = await cancelSchedule(job.id, finalReason)
    setSaving(false)
    if (res?.error) setError(res.error)
    else onDone()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={CalendarX2}
      iconTone="danger"
      title="Cancel this job?"
      subtitle={[job.client_name, job.location].filter(Boolean).join(' · ')}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Keep job</Button>
          <Button variant="danger" loading={saving} onClick={save}>Cancel job</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="Reason" htmlFor="cancel-reason" required error={error}>
          <Select id="cancel-reason" placeholder="Choose a reason" value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS} />
        </Field>
        <Field label={reason === 'Other' ? 'What happened' : 'Notes'} htmlFor="cancel-notes" hint={reason === 'Other' ? undefined : 'Optional'}>
          <Textarea id="cancel-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Client called at 7 AM; moving to Monday." />
        </Field>
        <p className="text-caption text-ink-3">The job stays in the history as cancelled, with this reason.</p>
      </div>
    </Modal>
  )
}
