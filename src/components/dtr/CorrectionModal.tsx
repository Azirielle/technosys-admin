// CorrectionModal: HR fixes or adds a time-in/out for one day. The reason is required and kept forever.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, ShieldCheck } from 'lucide-react'
import type { DailyAuditRecord, EmployeeAuditSummary } from '@/app/actions/audit'
import { correctTimeLogPunch } from '@/app/actions/audit-corrections'
import { formatDay } from '@/lib/format'
import { Button, Checkbox, Field, Input, Modal, Textarea } from '@/components/ui'
import { manilaHHMM, previewCorrection, shiftTimestamps } from './dtrTime'

const MIN_REASON = 10

export function CorrectionModal({
  employee,
  day,
  onClose,
  onSaved,
}: {
  employee: EmployeeAuditSummary | null
  day: DailyAuditRecord | null
  onClose: () => void
  /** Resolves once the DTR shows the change; Save keeps spinning until then */
  onSaved: () => Promise<void>
}) {
  const [timeIn, setTimeIn] = useState('08:00')
  const [timeOut, setTimeOut] = useState('17:00')
  const [endsNextDay, setEndsNextDay] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start from the recorded punch (or a normal 8–5 day when there is none).
  useEffect(() => {
    if (!day) return
    setTimeIn(manilaHHMM(day.rawTimeIn, '08:00'))
    setTimeOut(manilaHHMM(day.rawTimeOut, '17:00'))
    setEndsNextDay(false)
    setReason('')
    setError(null)
  }, [day])

  const preview = useMemo(() => (day ? previewCorrection(day, timeIn, timeOut, endsNextDay) : null), [day, timeIn, timeOut, endsNextDay])

  if (!employee || !day) return null
  const reasonShort = reason.trim().length < MIN_REASON

  async function save() {
    if (!employee || !day) return
    if (!preview) return setError('Time out must be after time in. Tick "Ends the next day" for shifts past midnight.')
    if (reasonShort) return setError(`Write a reason of at least ${MIN_REASON} characters.`)
    setSaving(true)
    setError(null)
    const { inIso, outIso } = shiftTimestamps(day.date, timeIn, timeOut, endsNextDay)
    try {
      const res = await correctTimeLogPunch({
        timeLogId: day.timeLogId,
        technicianId: employee.id,
        targetDate: day.date,
        timeIn: inIso,
        timeOut: outIso,
        reason: reason.trim(),
      })
      if (!res.success) setError(res.error || "Couldn't save the correction.")
      else await onSaved()
    } catch (err) {
      setError((err as Error).message || "Couldn't save the correction.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={Clock}
      title={day.actualTimeIn ? 'Correct time in and out' : 'Add a missing shift'}
      subtitle={`${employee.name} · ${formatDay(day.date)} (${day.dayOfWeek})`}
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>Save correction</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <p className="flex items-start gap-2 rounded-control bg-surface-soft p-3 text-caption text-ink-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          The original punch is kept. This change is saved with your name and reason, and shows as Corrected on the DTR.
        </p>

        <div className="grid grid-cols-2 gap-stack">
          <Field label="Time in" htmlFor="dtr-in">
            <Input id="dtr-in" type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} />
          </Field>
          <Field label="Time out" htmlFor="dtr-out">
            <Input id="dtr-out" type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} />
          </Field>
        </div>
        <Checkbox checked={endsNextDay} onChange={(e) => setEndsNextDay(e.target.checked)} label="Ends the next day (shift went past midnight)" />

        {preview ? (
          <dl className="grid grid-cols-4 gap-2 text-center">
            {[
              ['Hours', `${preview.netHours} h`, preview.mealBreakDeducted ? 'after 1 h break' : ''],
              ['Late', `${preview.lateMinutes} min`, ''],
              ['Regular OT', `${preview.regularOt} h`, ''],
              ['Sun/holiday OT', `${preview.sundayHolidayOt} h`, ''],
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-control bg-surface-soft px-2 py-2">
                <dt className="text-micro text-ink-3">{label}</dt>
                <dd className="text-small font-semibold text-ink tabular-nums">{value}</dd>
                {note && <dd className="text-micro text-ink-3">{note}</dd>}
              </div>
            ))}
          </dl>
        ) : (
          <p className="rounded-control bg-danger-soft p-3 text-caption text-danger">Time out must be after time in.</p>
        )}

        <Field
          label="Reason"
          htmlFor="dtr-reason"
          required
          hint={`${reason.trim().length} of at least ${MIN_REASON} characters`}
          error={error}
        >
          <Textarea
            id="dtr-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Phone battery died at the site. Coordinator confirmed he left at 5:10 PM."
          />
        </Field>
      </div>
    </Modal>
  )
}
