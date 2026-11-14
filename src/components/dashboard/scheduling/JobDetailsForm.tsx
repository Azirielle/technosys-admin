// JobDetailsForm: fix a job's name, address or where the crew reports, with a reason.
'use client'

import { useEffect, useState } from 'react'
import { Check, MapPin } from 'lucide-react'
import { updateAssignmentDetailsAction } from '@/app/actions/schedules'
import { Button, Field, Input, Textarea, cx } from '@/components/ui'
import type { ScheduleItem } from './types'

type Report = 'direct_to_site' | 'via_pacita_hq'

export function JobDetailsForm({ job, onDone }: { job: ScheduleItem; onDone: () => void }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [report, setReport] = useState<Report>('direct_to_site')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(job.project_name || job.client_name || '')
    setAddress(job.location || '')
    setReport((job.reporting_instruction as Report) || 'direct_to_site')
    setReason('')
    setError(null)
  }, [job])

  async function save() {
    if (!name.trim() || !address.trim()) return setError('Enter the job name and the address.')
    if (!reason.trim()) return setError('Write why the details changed.')
    setSaving(true)
    setError(null)
    const res = await updateAssignmentDetailsAction({ scheduleId: job.id, clientName: name.trim(), location: address.trim(), reportingInstruction: report, reason: reason.trim() })
    setSaving(false)
    if (res?.error) setError(res.error)
    else onDone()
  }

  return (
    <div className="flex flex-col gap-stack">
      <Field label="Job or customer name" htmlFor="jd-name" required>
        <Input id="jd-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Address" htmlFor="jd-address" required>
        <Input id="jd-address" icon={MapPin} value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      {job.assignment_type !== 'office_duty' && (
        <fieldset>
          <legend className="mb-1.5 text-caption font-medium text-ink-2">Where do they report?</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'direct_to_site' as const, label: 'Straight to the site' },
              { value: 'via_pacita_hq' as const, label: 'Pacita HQ first' },
            ].map((r) => (
              <label key={r.value} className={cx('cursor-pointer rounded-control border p-3 text-small', report === r.value ? 'border-ink bg-surface-soft font-medium text-ink' : 'border-line text-ink-2 hover:border-line-strong')}>
                <input type="radio" name="jd-report" className="sr-only" checked={report === r.value} onChange={() => setReport(r.value)} />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Field label="Reason" htmlFor="jd-reason" required hint="Saved in the job's history." error={error}>
        <Textarea id="jd-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer corrected the unit number." />
      </Field>
      <Button variant="primary" icon={Check} loading={saving} onClick={save} className="self-end">Save details</Button>
    </div>
  )
}
