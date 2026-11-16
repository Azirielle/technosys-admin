// TimeOutModal: the Coordinator times someone out (forgot, phone dead, van broke down). Picks the time and
// gives a reason; it's saved as a correction HR checks, and the person gets a push.
'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { timeOutPerson } from '@/app/actions/today'
import { Button, Field, Input, Modal, useToast } from '@/components/ui'
import type { WorkDay } from './todayData'

export function TimeOutModal({ day, onClose, onDone }: { day: WorkDay | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [time, setTime] = useState('17:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A fresh form for each person
  const [forId, setForId] = useState<string | null>(null)
  if ((day?.id ?? null) !== forId) { setForId(day?.id ?? null); setTime('17:00'); setReason(''); setError(null) }
  if (!day) return null

  async function save() {
    // The time is on the work day's date (Manila)
    const iso = new Date(`${day!.work_date}T${time}:00+08:00`).toISOString()
    setSaving(true)
    const res = await timeOutPerson(day!.id, iso, reason, day!.person_id, day!.name)
    setSaving(false)
    if (!res.ok) return setError(res.error)
    toast.success(`${day!.name.split(' ')[0]} is timed out. HR will see it.`)
    onDone()
  }

  return (
    <Modal isOpen onClose={onClose} icon={Clock} title={`Time out ${day.name}`} maxWidth="md"
      subtitle={`Timed in ${new Date(day.time_in).toLocaleString('en-PH', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })} at ${day.place_name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Time out</Button></>}>
      <div className="flex flex-col gap-stack">
        <Field label="They left at" htmlFor="to-time"><Input id="to-time" type="time" value={time} onChange={(e) => { setTime(e.target.value); setError(null) }} /></Field>
        <Field label="Reason" htmlFor="to-reason" required error={error} hint="At least 10 characters. HR and the person see it.">
          <Input id="to-reason" value={reason} onChange={(e) => { setReason(e.target.value); setError(null) }} placeholder="Phone died, left with the crew at 5" />
        </Field>
      </div>
    </Modal>
  )
}
