// WeekBoard: one row per person, Monday to Sunday. Multi-day jobs stretch across their days, leave is shaded,
// and each day header shows how many are free; click a header to show only the people free that day.
// Click an empty cell to schedule that person on that day, a job to open it.
'use client'

import type { CSSProperties } from 'react'
import { Avatar, cx, initialsOf } from '@/components/ui'
import type { Job, Person } from '@/components/jobs/jobTypes'
import { addDays, atRisk, checksOf, dayNumber, isFree, jobsOf, leaveOf, roleOn, clock12, weekdayShort, type Sched } from './scheduleMath'
import { JOB_TONE, VIP_TONE } from './scheduleStyles'
import { VipTag } from '@/components/jobs/VipTag'
import { WorkTypeBadge } from '@/components/jobs/WorkTypeBadge'

type Props = {
  S: Sched; people: Person[]; monday: string; date: string; today: string; now: number; freeOn: string | null
  onToggleFree: (d: string) => void; onOpenJob: (job: Job) => void; onOpenPerson: (p: Person) => void; onNew?: (p: Person, day: string) => void // none = read-only
}

export function WeekBoard({ S, people, monday, date, today, now, freeOn, onToggleFree, onOpenJob, onOpenPerson, onNew }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const all = S.people.length
  const grid: CSSProperties = { gridTemplateColumns: '184px repeat(7, minmax(112px, 1fr))' }

  return (
    <div className="grid min-w-[980px]" style={grid}>
      <div className="sticky left-0 top-0 z-30 border-b border-line bg-surface-soft px-3 py-2 text-caption text-ink-2">{all} field staff</div>
      {days.map((d) => {
        const free = S.people.filter((p) => isFree(S, p.id, d)).length
        return (
          <button key={d} type="button" onClick={() => onToggleFree(d)} aria-pressed={freeOn === d} title={`Show only the people free on ${weekdayShort(d)} ${dayNumber(d)}`}
            className={cx('sticky top-0 z-20 border-b border-l border-line px-2.5 py-2 text-left hover:bg-surface-hover',
              freeOn === d ? 'bg-info-soft shadow-[inset_0_-2px_0_var(--tc-info)]' : 'bg-surface-soft')}>
            <b className={cx('block text-small', d === today ? 'text-info' : d === date ? 'text-ink underline' : 'text-ink')}>{weekdayShort(d)} {dayNumber(d)}{d === today ? ' · today' : ''}</b>
            <span className={cx('text-caption font-semibold', free ? 'text-success' : 'text-danger')}>{free} of {all} free</span>
            <span className="mt-1 block h-1 overflow-hidden rounded-pill bg-line-strong"><span className="block h-full bg-success" style={{ width: `${all ? (free / all) * 100 : 0}%` }} /></span>
          </button>
        )
      })}

      {people.length === 0 && <p className="col-span-8 p-8 text-center text-small text-ink-2">No one matches. Clear the search or the filter.</p>}
      {people.map((p) => {
        const booked = days.filter((d) => jobsOf(S, p.id, d).length).length
        const cells = []
        for (const d of days) {
          const js = jobsOf(S, p.id, d).filter((j) => j.work_type !== 'in_house'), starts = js.filter((j) => j.start_date === d || d === monday)
          if (js.length && !starts.length) continue // drawn by a job that started on an earlier day of this week
          const span = Math.max(1, ...starts.map((j) => daysBetween(d, j.end_date < days[6] ? j.end_date : days[6]) + 1))
          const l = leaveOf(S, p.id, d), empty = !!onNew && !js.length && !(l && !l.pending)
          cells.push(
            <div key={d} onClick={empty ? () => onNew!(p, d) : undefined} style={{ gridColumn: `span ${span}` }}
              className={cx('relative flex min-h-10 flex-col gap-1 border-b border-l border-line p-1', d === today && 'bg-info-soft/40',
                freeOn && d !== freeOn && 'opacity-40', empty && 'group cursor-pointer hover:bg-surface-hover')}>
              {l && <span className={cx('truncate rounded-chip px-1.5 py-0.5 text-caption', l.pending ? 'bg-warning-soft text-warning' : 'bg-surface-soft text-ink-2 ring-1 ring-inset ring-line-strong')}>{l.type} leave{l.pending ? ' · waiting for HR' : ''}</span>}
              {starts.map((j) => {
                const risk = atRisk(S, j, d, today, now).includes(p.full_name), check = checksOf(S, j, d).length > 0
                return (
                  <button key={j.id} type="button" onClick={() => onOpenJob(j)} title={`${j.client_name} · ${clock12(j.start_time)} – ${clock12(j.end_time)}`}
                    className={cx('flex min-w-0 items-baseline gap-1.5 rounded-chip px-2 py-1 text-left text-caption', JOB_TONE[j.status], j.is_vip && j.status !== 'cancelled' && VIP_TONE,
                      risk ? 'ring-2 ring-inset ring-danger' : check ? 'ring-2 ring-inset ring-warning' : '')}>
                    {roleOn(j, p.id) === 'lead' && <span className="shrink-0 rounded px-1 text-[10px] font-bold text-ink-2 ring-1 ring-inset ring-line-strong">L</span>}
                    {j.is_vip && <VipTag />}
                    <WorkTypeBadge workType={j.work_type} className="text-[10px] py-0 px-1" />
                    <b className="min-w-0 truncate font-semibold text-ink">{j.client_name}</b>
                    <span className="ml-auto shrink-0 font-mono text-[10.5px] text-ink-2">{clock12(j.start_time)}</span>
                  </button>
                )
              })}
              {empty && <span className="pointer-events-none absolute inset-1 hidden place-items-center rounded-chip border border-dashed border-line-strong text-caption text-ink-2 group-hover:grid">+ New job</span>}
            </div>,
          )
        }
        return [
          <button key={`${p.id}-name`} type="button" onClick={() => onOpenPerson(p)} title={p.full_name}
            className="sticky left-0 z-10 flex min-h-10 items-center gap-2 border-b border-line bg-surface px-2.5 text-left hover:bg-surface-hover">
            {p.avatar_url ? <Avatar name={p.full_name} src={p.avatar_url} size="xs" />
              : <span className="grid size-6 shrink-0 place-items-center rounded-pill bg-surface-soft text-[10px] font-semibold text-ink">{initialsOf(p.full_name)}</span>}
            <span className="min-w-0 truncate text-small font-medium text-ink">{p.full_name}</span>
            <span className="ml-auto shrink-0 text-micro text-ink-3">{booked}/7</span>
          </button>,
          ...cells,
        ]
      })}
    </div>
  )
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
