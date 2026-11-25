// NewAccountModal: HR makes a technician or helper account (name, username, level, status, mobile, hire date).
'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button, Field, Input, Modal, Select } from '@/components/ui'
import type { NewAccount } from '@/app/actions/accounts'
import { EMPLOYMENT_STATUS, LEVELS } from './requirements'

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
const blank = (): NewAccount => ({ full_name: '', username: '', technician_level: 'technician', employment_status: 'ojt', contact_number: '', hire_date: today() })

export function NewAccountModal({
  open,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (form: NewAccount) => void
}) {
  const [form, setForm] = useState<NewAccount>(blank)
  if (!open) return null
  const set = (key: keyof NewAccount, value: string) => setForm({ ...form, [key]: value })
  const close = () => { setForm(blank()); onClose() }

  return (
    <Modal
      isOpen
      onClose={close}
      icon={UserPlus}
      title="New account"
      subtitle="For a technician or helper. They sign in on the phone with their mobile number and a PIN you set next."
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={() => onSave(form)}>Make account</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="Full name" htmlFor="new-name">
          <Input id="new-name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Juan Dela Cruz" />
        </Field>
        <Field label="Username" htmlFor="new-username" hint="Small letters or numbers, no spaces. Can't be changed later.">
          <Input id="new-username" value={form.username} onChange={(e) => set('username', e.target.value.toLowerCase())} placeholder="juan" maxLength={20} />
        </Field>
        <div className="grid grid-cols-1 gap-stack sm:grid-cols-2">
          <Field label="Level" htmlFor="new-level">
            <Select id="new-level" value={form.technician_level} onChange={(e) => set('technician_level', e.target.value)} options={LEVELS} />
          </Field>
          <Field label="Employment status" htmlFor="new-status">
            <Select id="new-status" value={form.employment_status} onChange={(e) => set('employment_status', e.target.value)} options={EMPLOYMENT_STATUS} />
          </Field>
          <Field label="Mobile number" htmlFor="new-phone" hint="11 digits starting with 09.">
            <Input id="new-phone" inputMode="tel" maxLength={16} value={form.contact_number} onChange={(e) => set('contact_number', e.target.value)} placeholder="09171234567" />
          </Field>
          <Field label="Hire date" htmlFor="new-hired">
            <Input id="new-hired" type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} />
          </Field>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
