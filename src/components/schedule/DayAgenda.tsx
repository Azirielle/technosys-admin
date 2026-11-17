// DayAgenda: the day's jobs in time order (dot = status, red at risk, yellow check) and "Needs you":
// people not timed in after the start, and things to check. Each line opens the job.
'use client'

import { cx } from '@/components/ui'
import type { Job } from '@/components/jobs/jobTypes'
import { atRisk, checksOf, jobsOn, shortClock, type Sched } from './scheduleMath'
import { DOT } from './scheduleStyles'

type Props = { S: Sched; date: string; today: string; now: number; onOpenJob: (job: Job) => void }

export function DayAgenda({ S, date, today, now, onOpenJob }: Props) {
  const jobs = jobsOn(S, date)
  const lead = (j: Job) => j.members.find((m) => m.is_acting_lead) ?? j.members.find((m) => m.role === 'lead')
  const needs = jobs.flatMap((j) => {
    const late = atRisk(S, j, date, today, now)
    return [
      ...(late.length ? [{ j, risk: true, text: `${j.client_name}: ${late.map((n) => n.split(' ')[0]).join(', ')} not timed in` }] : []),
      ...checksOf(S, j, date).map((c) => ({ j, risk: false, text: `${j.client_name}: ${c}` })),
    ]
  })

  return (
    <>
      <section className="flex flex-col gap-2 rounded-card bg-surface p-card-sm shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-small font-semibold text-ink">{date === today ? "Today's agenda" : 'Agenda'}</h3>
          <span className="text-caption text-ink-3">{jobs.length}</span>
        </div>
        {jobs.length === 0 && <p className="text-caption text-ink-3">No jobs this day.</p>}
        <div className="flex max-h-80 flex-col overflow-auto">
          {jobs.map((j) => {
            const tone = atRisk(S, j, date, today, now).length ? 'risk' : checksOf(S, j, date).length ? 'check' : j.status === 'ongoing' ? 'ongoing' : j.status === 'done' ? 'done' : 'planned'
            const l = lead(j), more = j.members.length - 1
            return (
              <button key={j.id} type="button" onClick={() => onOpenJob(j)} className="grid grid-cols-[10px_1fr] gap-x-2 rounded-chip px-2 py-1.5 text-left hover:bg-surface-hover">
                <span className={cx('mt-1.5 size-2 rounded-pill', DOT[tone])} />
                <span className="truncate text-small font-medium text-ink">{j.client_name}</span>
                <span className="col-start-2 text-caption text-ink-2">{shortClock(j.start_time)} · {l?.name.split(' ')[0] ?? 'No lead'}{more > 0 ? ` +${more}` : ''}</span>
              </button>
            )
          })}
        </div>
      </section>
      {needs.length > 0 && (
        <section className="flex flex-col gap-2 rounded-card bg-surface p-card-sm shadow-card">
          <h3 className="text-small font-semibold text-ink">Needs you</h3>
          {needs.map((n, i) => (
            <button key={i} type="button" onClick={() => onOpenJob(n.j)}
              className={cx('rounded-chip px-2.5 py-2 text-left text-caption', n.risk ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning')}>
              {n.text}
            </button>
          ))}
        </section>
      )}
    </>
  )
}
