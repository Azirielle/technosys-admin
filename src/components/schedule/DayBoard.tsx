// DayBoard: one day, one column per person, hours down the side (6 AM–7 PM, wider when a job starts earlier or
// ends later). The names row and the "All day" row (leave, multi-day jobs) stay on top while the hours scroll;
// on open it scrolls to the current time (today) or the first job. Click a job, a name or an empty slot.
'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cx } from '@/components/ui'
import type { Job, Person } from '@/components/jobs/jobTypes'
import { boardHours, jobsOf, jobsOn, leaveOf, mins, shortClock, type Sched } from './scheduleMath'
import { clashesOf } from './scheduleStatus'
import { PersonHeader } from './PersonHeader'
import { DayJobCard } from './DayJobCard'

const SLOT = 27 // px per half hour
const HEAD = 100 // px, the names row
const COL = 112 // px, narrowest a person's column gets
const BOX = 56 // px, height of a job box (a little over an hour), whatever the job's length

type Props = {
  S: Sched; people: Person[]; date: string; today: string; now: number
  onOpenJob: (job: Job) => void; onOpenPerson: (p: Person) => void; onNew?: (p: Person, time: string) => void // none = read-only
}

export function DayBoard({ S, people, date, today, now, onOpenJob, onOpenPerson, onNew }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const { start, end } = boardHours(S, date)
  const hours = end - start
  const y = (m: number) => ((m - start * 60) / 30) * SLOT

  // Scroll the hours (not the page) to an hour before now, or to the first job of the day
  const firstJob = jobsOn(S, date)[0]?.start_time
  useEffect(() => {
    const box = root.current?.parentElement
    if (!box) return
    // Today: from the first job's start if "now" still fits on screen, else an hour before now
    const shownMins = ((box.clientHeight - HEAD - 40) / SLOT) * 30
    const from = firstJob ? mins(firstJob) - 30 : start * 60
    const target = date === today ? Math.max(Math.min(from, now - 60), now + 30 - shownMins) : from
    box.scrollTop = Math.max(0, y(target))
    // Only when the day changes, not on every live reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, !!firstJob])

  if (!people.length) return <p className="p-8 text-center text-small text-ink-2">No one matches. Clear the search or the filter.</p>
  // Columns share the width; below 112 px each, the board scrolls sideways (names and hours stay in place)
  const grid: CSSProperties = { gridTemplateColumns: `56px repeat(${people.length}, minmax(${COL}px, 1fr))`, minWidth: 56 + people.length * COL }

  function slotClick(e: React.MouseEvent<HTMLDivElement>, p: Person) {
    if (!onNew || e.target !== e.currentTarget) return
    const m = start * 60 + Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / SLOT) * 30
    onNew(p, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }

  return (
    <div ref={root} className="grid w-full" style={grid}>
      <div className="sticky left-0 top-0 z-30 border-b border-r border-line bg-surface" style={{ height: HEAD }} />
      {people.map((p) => <PersonHeader key={p.id} S={S} person={p} date={date} today={today} now={now} height={HEAD} onOpen={onOpenPerson} />)}

      {/* All day: leave and multi-day jobs */}
      <div className="sticky left-0 z-30 flex items-center border-b border-r border-line bg-surface px-1.5 text-caption font-medium text-ink-2" style={{ top: HEAD }}>All day</div>
      {people.map((p) => {
        const l = leaveOf(S, p.id, date), multi = jobsOf(S, p.id, date).filter((j) => j.end_date > j.start_date)
        return (
          <div key={p.id} className="sticky z-20 flex min-h-[44px] flex-col justify-center gap-1 border-b border-l border-line bg-surface p-1" style={{ top: HEAD }}>
            {l && <span className={cx('truncate rounded-chip border-l-[3px] px-1.5 py-1 text-micro font-medium', l.pending ? 'border-l-warning bg-warning-soft text-warning' : 'border-l-ink-3 bg-surface-soft text-ink-2')}>{l.type} leave{l.pending ? ' · waiting for HR' : ''}</span>}
            {multi.map((j) => (
              <button key={j.id} type="button" onClick={() => onOpenJob(j)} className="truncate rounded-chip border-l-[3px] border-l-info bg-info-soft px-1.5 py-1 text-left text-micro font-medium text-ink hover:brightness-95">
                Day {daysBetween(j.start_date, date) + 1} of {daysBetween(j.start_date, j.end_date) + 1} · {j.client_name}
              </button>
            ))}
          </div>
        )
      })}

      {/* Hours down the side */}
      {Array.from({ length: hours }, (_, i) => (
        <div key={i} className="sticky left-0 z-10 border-r border-line bg-surface pr-2 pt-1 text-right text-small tabular-nums text-ink-2" style={{ gridColumn: 1, gridRow: i + 3, height: SLOT * 2 }}>
          {shortClock(`${start + i}:00`)}m
        </div>
      ))}

      {/* One column per person */}
      {people.map((p, ci) => {
        const leave = leaveOf(S, p.id, date), away = !!leave && !leave.pending
        const js = jobsOf(S, p.id, date), clash = clashesOf(S, p.id, date), lanes = laneOf(js, (j) => mins(j.start_time) + (BOX / SLOT) * 30)
        const width = Math.max(0, ...lanes.values()) + 1
        return (
          <div key={p.id} onClick={(e) => slotClick(e, p)} title={onNew ? 'Click an empty slot to schedule a job' : undefined}
            className={cx('relative border-l border-line', onNew && 'cursor-copy', away && 'bg-surface-soft/60')}
            style={{ gridColumn: ci + 2, gridRow: `3 / span ${hours}`, height: SLOT * hours * 2, ...LINES }}>
            {js.map((j) => (
              <DayJobCard key={j.id} S={S} job={j} personId={p.id} personName={p.full_name} date={date} today={today} now={now}
                top={y(mins(j.start_time))} height={BOX + 4}
                lane={lanes.get(j.id) ?? 0} lanes={width} clashWith={clash.get(j.id)}
                highlighted={hover === j.id && j.members.length > 1} onHover={setHover} onOpen={onOpenJob} />
            ))}
            {date === today && now > start * 60 && now < end * 60 && (
              <div className="pointer-events-none absolute inset-x-0 z-[2] h-0.5 bg-danger" style={{ top: y(now) }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Side-by-side lanes for boxes that would cover each other (jobs close together or a clash). Jobs come sorted by start. */
function laneOf(js: Job[], boxEnd: (j: Job) => number): Map<string, number> {
  const ends: number[] = [], out = new Map<string, number>()
  for (const j of js) {
    let lane = ends.findIndex((e) => e <= mins(j.start_time))
    if (lane < 0) lane = ends.length
    ends[lane] = boxEnd(j)
    out.set(j.id, lane)
  }
  return out
}

// Hour and half-hour lines behind the slots
const LINES: CSSProperties = {
  backgroundImage: 'linear-gradient(var(--tc-line) 1px, transparent 1px), linear-gradient(color-mix(in srgb, var(--tc-line) 55%, transparent) 1px, transparent 1px)',
  backgroundSize: `100% ${SLOT * 2}px, 100% ${SLOT}px`,
  backgroundPosition: `0 0, 0 ${SLOT}px`,
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
