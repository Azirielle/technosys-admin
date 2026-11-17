// TempWorkerModal: add or edit a temporary worker (hired per job, no app account).
'use client'

import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { saveTempWorker } from '@/app/actions/tempWorkers'
import { Button, Field, Input, Modal } from '@/components/ui'
import type { TempWorkerItem } from './scheduleData'

type Props = { isOpen: boolean; worker: TempWorkerItem | null; onClose: () => void; onDone: () => void }

export function TempWorkerModal({ isOpen, worker, onClose, onDone }: Props) {
  const [form, setForm] = useState({ fullName: '', contactNumber: '', emergencyContact: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setForm({ fullName: worker?.full_name ?? '', contactNumber: worker?.contact_number ?? '', emergencyContact: worker?.emergency_contact ?? '' })
  }, [isOpen, worker])

  if (!isOpen) return null

  async function save() {
    setSaving(true)
    const res = await saveTempWorker(form, worker?.id)
    setSaving(false)
    if (!res.ok) setError(res.error)
    else onDone()
  }

  return (
    <Modal isOpen onClose={onClose} icon={UserPlus} maxWidth="md"
      title={worker ? 'Edit temporary worker' : 'Add a temporary worker'} subtitle="For helpers hired per job who don't use the mobile app."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={save}>{worker ? 'Save changes' : 'Add worker'}</Button>
      </>}>
      <div className="flex flex-col gap-stack">
        <Field label="Full name" htmlFor="temp-name" required>
          <Input id="temp-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Mario Santos" />
        </Field>
        <Field label="Mobile number" htmlFor="temp-phone" required>
          <Input id="temp-phone" type="tel" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="09171234567" />
        </Field>
        <Field label="Emergency contact" htmlFor="temp-emergency" hint="Name, relationship and number" error={error}>
          <Input id="temp-emergency" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Ana Santos (wife), 09181234567" />
        </Field>
      </div>
    </Modal>
  )
}
