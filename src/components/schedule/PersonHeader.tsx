// PersonHeader: the top of one person's column on the Day board, laid out like the FieldCamp reference
// (avatar, name ›, a bar with the hours). Three facts kept apart: availability (Available / hours booked /
// On leave), the bar to 8 h, and attendance from the phone on its own line under it.
'use client'

import { ChevronRight } from 'lucide-react'
import { cx, initialsOf } from '@/components/ui'
import type { Person } from '@/components/jobs/jobTypes'
import { hoursOf, type Sched } from './scheduleMath'
import { attendanceOf, availabilityOf } from './scheduleStatus'
import { STATUS_TEXT } from './scheduleStyles'

type Props = { S: Sched; person: Person; date: string; today: string; now: number; height: number; onOpen: (p: Person) => void }

export function PersonHeader({ S, person: p, date, today, now, height, onOpen }: Props) {
  const avail = availabilityOf(S, p.id, date), att = attendanceOf(S, p.id, date, today, now), hrs = hoursOf(S, p.id, date)
  const role = p.role === 'helper' ? 'Helper' : p.technician_level === 'senior' ? 'Senior technician' : 'Technician'
  const right = avail.label === 'Assigned' ? fmtHours(hrs) : avail.label

  return (
    <button type="button" onClick={() => onOpen(p)} title={`${p.full_name} · ${role}${avail.detail ? ` · ${avail.detail}` : ''}: open their week`}
      className="group sticky top-0 z-20 flex flex-col items-center gap-1 border-b border-l border-line bg-surface px-2.5 pt-2.5 text-center hover:bg-surface-hover" style={{ height }}>
      <span className="grid size-8 shrink-0 place-items-center rounded-pill bg-action text-micro font-semibold text-on-action">{initialsOf(p.full_name)}</span>
      <span className="flex max-w-full items-center gap-0.5 text-caption font-semibold text-ink">
        <span className="truncate">{p.full_name}</span>
        <ChevronRight className="size-3 shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
      </span>
      <span className="flex w-full items-center gap-2">
        <span className="h-[3px] flex-1 overflow-hidden rounded-pill bg-line" aria-hidden>
          <span className={cx('block h-full', hrs > 8 ? 'bg-warning' : 'bg-ink')} style={{ width: `${Math.min(100, (hrs / 8) * 100)}%` }} />
        </span>
        <span className={cx('shrink-0 text-micro font-medium tabular-nums', avail.label === 'Assigned' ? 'text-ink-2' : STATUS_TEXT[avail.tone])}>{right}</span>
      </span>
      {att && (
        <span className={cx('max-w-full truncate text-micro font-medium', STATUS_TEXT[att.tone])} title={att.detail ? `${att.label} · ${att.detail}` : att.label}>
          {att.label}{att.detail && att.tone !== 'neutral' ? <span className="font-normal"> · {att.detail}</span> : null}
        </span>
      )}
    </button>
  )
}

const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}h`
