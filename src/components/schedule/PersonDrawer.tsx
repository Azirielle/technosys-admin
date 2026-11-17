// PersonDrawer: one field worker's week at a glance (jobs, leave, free days), their availability and attendance
// on the day shown, with "Schedule" to start a new job with them already picked.
'use client'

import { CalendarPlus } from 'lucide-react'
import { Badge, Button, Drawer } from '@/components/ui'
import type { Job, Person } from '@/components/jobs/jobTypes'
import { addDays, clock12, dayNumber, jobsOf, leaveOf, weekStart, weekdayShort, type Sched } from './scheduleMath'
import { attendanceOf, availabilityOf } from './scheduleStatus'

type Props = {
  S: Sched; person: Person | null; date: string; today: string; now: number; readOnly: boolean
  onClose: () => void; onOpenJob: (job: Job) => void; onSchedule: (p: Person) => void
}

export function PersonDrawer({ S, person, date, today, now, readOnly, onClose, onOpenJob, onSchedule }: Props) {
  if (!person) return null
  const avail = availabilityOf(S, person.id, date), att = attendanceOf(S, person.id, date, today, now)
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i))
  const first = person.full_name.split(' ')[0]

  return (
    <Drawer isOpen onClose={onClose} width="md" title={person.full_name}
      subtitle={person.role === 'helper' ? 'Helper' : person.technician_level === 'senior' ? 'Senior technician' : 'Technician'}
      headerExtra={<span className="flex gap-1.5"><Badge tone={avail.tone}>{avail.label}</Badge>{att && <Badge tone={att.tone}>{att.label}</Badge>}</span>}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {!readOnly && <Button variant="primary" icon={CalendarPlus} onClick={() => onSchedule(person)}>Schedule {first}</Button>}
      </>}>
      <section className="flex flex-col gap-2">
        <h3 className="text-small font-medium text-ink">This week</h3>
        <ul className="flex flex-col divide-y divide-line">
          {week.map((d) => {
            const js = jobsOf(S, person.id, d), l = leaveOf(S, person.id, d)
            return (
              <li key={d} className="flex gap-3 py-2 text-small">
                <span className={d === date ? 'w-16 font-semibold text-ink' : 'w-16 text-ink-2'}>{weekdayShort(d)} {dayNumber(d)}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  {l && <span className={l.pending ? 'text-warning' : 'text-ink-2'}>{l.type} leave{l.pending ? ' (waiting for HR)' : ''}</span>}
                  {js.map((j) => (
                    <button key={j.id} type="button" onClick={() => onOpenJob(j)} className="truncate text-left text-ink hover:underline">
                      {j.client_name} <span className="text-ink-3">· {clock12(j.start_time)} – {clock12(j.end_time)}</span>
                    </button>
                  ))}
                  {!l && !js.length && <span className="text-info">Free</span>}
                </span>
              </li>
            )
          })}
        </ul>
        {date === today && <p className="text-caption text-ink-3">Status comes from their phone&apos;s time-in today.</p>}
      </section>
    </Drawer>
  )
}
