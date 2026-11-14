// JobRescheduleForm: move a job to another date or time, with a reason. Warns if the lead is already booked then.
'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { rescheduleAssignmentAction } from '@/app/actions/schedules'
import { Button, Field, Input, Textarea } from '@/components/ui'
import { formatLocalDate, type ScheduleItem } from './types'

const TWO_HOURS = 2 * 3600000

export function JobRescheduleForm({ job, allJobs, onDone }: { job: ScheduleItem; allJobs: ScheduleItem[]; onDone: (date: string) => void }) {
  const [date, setDate] = useState('')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const s = new Date(job.start_time)
    setDate(formatLocalDate(s))
    setStart(s.toTimeString().slice(0, 5))
    setEnd(job.end_time ? new Date(job.end_time).toTimeString().slice(0, 5) : '17:00')
    setReason('')
    setError(null)
  }, [job])

  // Another active job for the same lead at overlapping times.
  const clash = (() => {
    if (!job.technician_id || !date || !start) return null
    const from = new Date(`${date}T${start}:00`).getTime()
    const to = end ? new Date(`${date}T${end}:00`).getTime() : from + TWO_HOURS
    return allJobs.find((o) => {
      if (o.id === job.id || o.status === 'cancelled' || o.technician_id !== job.technician_id) return false
      const oFrom = new Date(o.start_time).getTime()
      const oTo = o.end_time ? new Date(o.end_time).getTime() : oFrom + TWO_HOURS
      return from < oTo && to > oFrom
    })
  })()

  async function save() {
    if (!reason.trim()) return setError('Write why the job is moving.')
    setSaving(true)
    setError(null)
    const res = await rescheduleAssignmentAction({ scheduleId: job.id, newDate: date, newStartTime: start, newEndTime: end, reason: reason.trim() })
    setSaving(false)
    if (res?.error) setError(res.error)
    else onDone(date)
  }

  return (
    <div className="flex flex-col gap-stack">
      <Field label="New date" htmlFor="rs-date" required>
        <Input id="rs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-stack">
        <Field label="Start" htmlFor="rs-start" required>
          <Input id="rs-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Expected finish" htmlFor="rs-end">
          <Input id="rs-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      {clash && (
        <p className="flex items-start gap-2 rounded-control bg-warning-soft p-3 text-small text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {job.profiles?.full_name} already has &ldquo;{clash.client_name}&rdquo; at that time.
        </p>
      )}
      <Field label="Reason" htmlFor="rs-reason" required hint="Saved in the job's history." error={error}>
        <Textarea id="rs-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer asked for the afternoon because of building maintenance." />
      </Field>
      <Button variant="primary" icon={Clock} loading={saving} onClick={save} className="self-end">Move job</Button>
    </div>
  )
}
