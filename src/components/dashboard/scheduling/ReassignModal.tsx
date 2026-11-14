// ReassignModal: give a job's lead role to another technician, with an optional reason.
'use client'

import { useEffect, useState } from 'react'
import { UserRoundCog } from 'lucide-react'
import { reassignSchedule } from '@/app/actions/schedules'
import { Button, Field, Input, Modal, Select } from '@/components/ui'
import type { ProfileItem, ScheduleItem } from './types'

export function ReassignModal({
  job,
  profiles,
  onClose,
  onDone,
}: {
  job: ScheduleItem | null
  profiles: ProfileItem[]
  onClose: () => void
  onDone: () => void
}) {
  const [techId, setTechId] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTechId('')
    setReason('')
    setError(null)
  }, [job?.id])

  if (!job) return null
  const choices = profiles
    .filter((p) => p.role === 'technician' && p.technician_level !== 'helper' && p.id !== job.technician_id)
    .map((p) => ({ value: p.id, label: `${p.full_name}${p.lifecycle_status === 'on_leave' ? ' (on leave)' : ''}` }))

  async function save() {
    if (!job) return
    if (!techId) return setError('Choose who takes over.')
    setSaving(true)
    const res = await reassignSchedule(job.id, techId, null, reason)
    setSaving(false)
    if (res?.error) setError(res.error)
    else onDone()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={UserRoundCog}
      title="Change lead technician"
      subtitle={`${job.client_name} · now ${job.profiles?.full_name || 'nobody'}`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Change lead</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="New lead technician" htmlFor="reassign-tech" required error={error}>
          <Select id="reassign-tech" placeholder="Choose a technician" value={techId} onChange={(e) => setTechId(e.target.value)} options={choices} />
        </Field>
        <Field label="Reason" htmlFor="reassign-reason" hint="Optional. Saved in the job's history.">
          <Input id="reassign-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ramon is still at the previous job" />
        </Field>
        <p className="text-caption text-ink-3">Both technicians get a notification on their phone.</p>
      </div>
    </Modal>
  )
}
