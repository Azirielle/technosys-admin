// WarningModal: HR records a disciplinary warning (level, what happened, when).
'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { WARNING_LEVELS, type EmployeeFile } from './requirements'

export function WarningModal({
  employee,
  saving,
  onClose,
  onSave,
}: {
  employee: EmployeeFile | null
  saving: boolean
  onClose: () => void
  onSave: (level: string, subject: string, details: string, incidentDate: string) => void
}) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
  const [level, setLevel] = useState(WARNING_LEVELS[1].value)
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLevel(WARNING_LEVELS[1].value)
    setSubject('')
    setDetails('')
    setDate(today)
    setError(null)
  }, [employee?.id, today])

  if (!employee) return null

  function submit() {
    if (!subject.trim() || !details.trim()) return setError('Fill in what happened and the details.')
    onSave(level, subject, details, date)
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={ShieldAlert}
      iconTone="warning"
      title="Add a warning"
      subtitle={employee.full_name}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Save warning</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <div className="grid grid-cols-1 gap-stack sm:grid-cols-2">
          <Field label="Type" htmlFor="warn-level">
            <Select id="warn-level" value={level} onChange={(e) => setLevel(e.target.value)} options={WARNING_LEVELS} />
          </Field>
          <Field label="Date it happened" htmlFor="warn-date">
            <Input id="warn-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="What happened" htmlFor="warn-subject" required>
          <Input id="warn-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Late three times this week" />
        </Field>
        <Field label="Details" htmlFor="warn-details" required error={error}>
          <Textarea
            id="warn-details"
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Timed in at 8:40, 8:55 and 9:10 on 10–12 Nov. Talked with him on 12 Nov; he agreed to leave home earlier."
          />
        </Field>
      </div>
    </Modal>
  )
}
