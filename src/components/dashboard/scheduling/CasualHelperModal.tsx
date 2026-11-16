// CasualHelperModal: add or edit a temporary worker (hired per job, no app account).
'use client'

import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { createCasualHelper, updateCasualHelper } from '@/app/actions/schedules'
import { Button, Field, Input, Modal } from '@/components/ui'
import type { CasualHelperItem } from './types'

export function CasualHelperModal({
  isOpen,
  helper,
  onClose,
  onDone,
}: {
  isOpen: boolean
  /** null = add a new worker. */
  helper: CasualHelperItem | null
  onClose: () => void
  onDone: () => void
}) {
  const [form, setForm] = useState({ fullName: '', contactNumber: '', emergencyContact: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setForm({
      fullName: helper?.full_name ?? '',
      contactNumber: helper?.contact_number ?? '',
      emergencyContact: helper?.emergency_contact ?? '',
      notes: helper?.notes ?? '',
    })
  }, [isOpen, helper])

  if (!isOpen) return null

  async function save() {
    if (!form.fullName.trim() || !form.contactNumber.trim()) return setError('Enter a name and a mobile number.')
    setSaving(true)
    const res = helper ? await updateCasualHelper(helper.id, form) : await createCasualHelper(form)
    setSaving(false)
    if (res?.error) setError(res.error)
    else onDone()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={UserPlus}
      title={helper ? 'Edit temporary worker' : 'Add a temporary worker'}
      subtitle="For helpers hired per job who don't use the mobile app."
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>{helper ? 'Save changes' : 'Add worker'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="Full name" htmlFor="casual-name" required>
          <Input id="casual-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Mario Santos" />
        </Field>
        <Field label="Mobile number" htmlFor="casual-phone" required>
          <Input id="casual-phone" type="tel" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="09171234567" />
        </Field>
        <Field label="Emergency contact" htmlFor="casual-emergency" hint="Name, relationship and number" error={error}>
          <Input id="casual-emergency" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Ana Santos (wife), 09181234567" />
        </Field>
      </div>
    </Modal>
  )
}
