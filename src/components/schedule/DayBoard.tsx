// DayBoard: one day, one column per person, hours down the side (6 AM–7 PM). Each name shows the day's booked
// hours and live status from the phone; an "All day" row holds leave and multi-day jobs. Click a job, a name
// or an empty slot (→ new job at that time). Red outline = at risk, yellow = check.
'use client'

import type { CSSProperties } from 'react'
import { cx, initialsOf } from '@/components/ui'
import type { Job, Person } from '@/components/jobs/jobTypes'
import { DAY_END, DAY_START, atRisk, checksOf, hoursOf, jobsOf, leaveOf, mins, personStatus, roleOn, shortClock, type Sched } from './scheduleMath'
import { JOB_TONE, STATUS_PILL } from './scheduleStyles'

const SLOT = 26 // px per half hour
const HEAD = 100 // px, the names row
const HOURS = DAY_END - DAY_START

type Props = {
  S: Sched; people: Person[]; date: string; today: string; now: number
  onOpenJob: (job: Job) => void; onOpenPerson: (p: Person) => void; onNew: (p: Person, time: string) => void
}

export function DayBoard({ S, people, date, today, now, onOpenJob, onOpenPerson, onNew }: Props) {
  if (!people.length) return <p className="p-8 text-center text-small text-ink-2">No one matches. Clear the search or the filter.</p>
  const grid: CSSProperties = { gridTemplateColumns: `60px repeat(${people.length}, minmax(140px, 1fr))` }

  function slotClick(e: React.MouseEvent<HTMLDivElement>, p: Person) {
    if (e.target !== e.currentTarget) return
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const m = DAY_START * 60 + Math.floor(y / SLOT) * 30
    onNew(p, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }

  return (
    <div className="grid min-w-max" style={grid}>
      {/* Names */}
      <div className="sticky left-0 top-0 z-30 border-b border-r border-line bg-surface" style={{ height: HEAD }} />
      {people.map((p) => {
        const st = personStatus(S, p.id, date, today, now), hrs = hoursOf(S, p.id, date)
        return (
          <button key={p.id} type="button" onClick={() => onOpenPerson(p)} title={p.full_name}
            className="sticky top-0 z-20 flex flex-col items-center gap-0.5 border-b border-l border-line bg-surface px-1.5 pt-2 text-center hover:bg-surface-hover" style={{ height: HEAD }}>
            <span className="grid size-8 place-items-center rounded-pill bg-action text-micro font-semibold text-on-action">{initialsOf(p.full_name)}</span>
            <span className="max-w-[128px] truncate text-caption font-semibold text-ink">{p.full_name}</span>
            <span className="text-micro text-ink-3">{p.role === 'helper' ? 'Helper' : p.technician_level === 'senior' ? 'Senior tech' : 'Technician'} · {hrs ? `${hrs.toFixed(1)} h` : 'free'}</span>
            <span className="h-[3px] w-16 overflow-hidden rounded-pill bg-line-strong"><span className="block h-full bg-ink" style={{ width: `${Math.min(100, (hrs / 8) * 100)}%` }} /></span>
            <span className={cx('mt-0.5 rounded-pill px-2 text-micro font-semibold', STATUS_PILL[st.tone])}>{st.label}</span>
          </button>
        )
      })}

      {/* All day: leave and multi-day jobs */}
      <div className="sticky left-0 z-30 border-b border-r border-line-strong bg-surface-soft px-2 py-2 text-micro text-ink-2" style={{ top: HEAD }}>All day</div>
      {people.map((p) => {
        const l = leaveOf(S, p.id, date), multi = jobsOf(S, p.id, date).filter((j) => j.end_date > j.start_date)
        return (
          <div key={p.id} className="sticky z-20 flex min-h-[34px] flex-col gap-1 border-b border-l border-line border-b-line-strong bg-surface-soft p-1" style={{ top: HEAD }}>
            {l && <span className={cx('truncate rounded-chip px-1.5 py-0.5 text-micro', l.pending ? 'bg-warning-soft text-warning' : 'bg-surface text-ink-2 ring-1 ring-inset ring-line-strong')}>{cap(l.type)} leave{l.pending ? ' · waiting for HR' : ''}</span>}
            {multi.map((j) => (
              <button key={j.id} type="button" onClick={() => onOpenJob(j)} className="truncate rounded-chip bg-surface px-1.5 py-0.5 text-left text-micro text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-hover">
                Day {daysBetween(j.start_date, date) + 1} of {daysBetween(j.start_date, j.end_date) + 1} · {j.client_name}
              </button>
            ))}
          </div>
        )
      })}

      {/* Hours down the side */}
      {Array.from({ length: HOURS }, (_, i) => (
        <div key={i} className="sticky left-0 z-10 border-b border-r border-line bg-surface pr-2 pt-0.5 text-right font-mono text-micro text-ink-2" style={{ gridColumn: 1, gridRow: i + 3, height: SLOT * 2 }}>
          {shortClock(`${DAY_START + i}:00`)}
        </div>
      ))}

      {/* One column per person */}
      {people.map((p, ci) => {
        const leave = leaveOf(S, p.id, date), away = !!leave && !leave.pending
        return (
          <div key={p.id} onClick={(e) => slotClick(e, p)} title="Click an empty slot to schedule a job"
            className={cx('relative cursor-copy border-l border-line', away && 'bg-surface-soft/60')}
            style={{ gridColumn: ci + 2, gridRow: `3 / span ${HOURS}`, height: SLOT * HOURS * 2, ...LINES }}>
            {jobsOf(S, p.id, date).map((j) => {
              const a = Math.max(mins(j.start_time), DAY_START * 60), b = Math.min(mins(j.end_time), DAY_END * 60)
              const risk = atRisk(S, j, date, today, now).includes(p.full_name), check = checksOf(S, j, date).length > 0
              return (
                <button key={j.id} type="button" onClick={() => onOpenJob(j)}
                  className={cx('absolute inset-x-1 z-[1] flex flex-col gap-px overflow-hidden rounded-chip px-2 py-1 text-left text-caption leading-tight', JOB_TONE[j.status],
                    risk ? 'ring-2 ring-inset ring-danger' : check ? 'ring-2 ring-inset ring-warning' : '')}
                  style={{ top: ((a - DAY_START * 60) / 30) * SLOT + 2, height: Math.max(SLOT, ((b - a) / 30) * SLOT) - 4 }}>
                  <b className="truncate font-semibold text-ink">{j.client_name}</b>
                  <span className="font-mono text-[10.5px] text-ink-2">{shortClock(j.start_time)}–{shortClock(j.end_time)}</span>
                  {roleOn(j, p.id) === 'lead' && <span className="text-[10px] font-bold text-ink-2">Lead</span>}
                  {roleOn(j, p.id) === 'driver' && <span className="text-[10px] font-bold text-ink-2">Driver</span>}
                  {mins(j.start_time) < DAY_START * 60 && <span className="text-[10px] text-ink-2">starts {shortClock(j.start_time)}</span>}
                </button>
              )
            })}
            {date === today && now > DAY_START * 60 && now < DAY_END * 60 && (
              <div className="pointer-events-none absolute inset-x-0 z-[2] h-0.5 bg-danger" style={{ top: ((now - DAY_START * 60) / 30) * SLOT }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Hour and half-hour lines behind the slots
const LINES: CSSProperties = {
  backgroundImage: 'linear-gradient(var(--tc-line) 1px, transparent 1px), linear-gradient(color-mix(in srgb, var(--tc-line) 55%, transparent) 1px, transparent 1px)',
  backgroundSize: `100% ${SLOT * 2}px, 100% ${SLOT}px`,
  backgroundPosition: `0 0, 0 ${SLOT}px`,
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
