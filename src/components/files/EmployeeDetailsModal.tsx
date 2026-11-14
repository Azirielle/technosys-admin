// EmployeeDetailsModal: change someone's employment status, level and mobile number.
'use client'

import { useEffect, useState } from 'react'
import { UserCog } from 'lucide-react'
import { Button, Field, Input, Modal, Select } from '@/components/ui'
import { EMPLOYMENT_STATUS, LEVELS, type EmployeeFile } from './requirements'

export type DetailsForm = { employment_status: string; technician_level: string; contact_number: string }

export function EmployeeDetailsModal({
  employee,
  saving,
  error,
  onClose,
  onSave,
}: {
  employee: EmployeeFile | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (form: DetailsForm) => void
}) {
  const [form, setForm] = useState<DetailsForm>({ employment_status: 'regular', technician_level: 'technician', contact_number: '' })

  useEffect(() => {
    if (!employee) return
    setForm({
      employment_status: employee.employment_status || 'regular',
      technician_level: employee.technician_level || 'technician',
      contact_number: employee.contact_number || '',
    })
  }, [employee])

  if (!employee) return null
  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={UserCog}
      title="Edit employee details"
      subtitle={employee.full_name}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={() => onSave(form)}>Save details</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <div className="grid grid-cols-1 gap-stack sm:grid-cols-2">
          <Field label="Employment status" htmlFor="emp-status">
            <Select id="emp-status" value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value })} options={EMPLOYMENT_STATUS} />
          </Field>
          <Field label="Level" htmlFor="emp-level">
            <Select id="emp-level" value={form.technician_level} onChange={(e) => setForm({ ...form, technician_level: e.target.value })} options={LEVELS} />
          </Field>
        </div>
        <Field label="Mobile number" htmlFor="emp-phone" hint="11 digits starting with 09. +63 numbers are converted." error={error}>
          <Input
            id="emp-phone"
            inputMode="tel"
            maxLength={16}
            value={form.contact_number}
            onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
            placeholder="09171234567"
          />
        </Field>
      </div>
    </Modal>
  )
}
