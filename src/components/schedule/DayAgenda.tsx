// DayAgenda: the day's jobs in time order, in the side panel (dot = status, red at risk, yellow check; clock and
// start time under the name, like the reference). Each line opens the job. The day's problems are in NeedsYou.
'use client'

import { Clock } from 'lucide-react'
import { cx } from '@/components/ui'
import type { Job } from '@/components/jobs/jobTypes'
import { atRisk, checksOf, clock12, jobsOn, type Sched } from './scheduleMath'
import { DOT } from './scheduleStyles'
import { PanelSection } from './PanelSection'

type Props = { S: Sched; date: string; today: string; now: number; onOpenJob: (job: Job) => void }

export function DayAgenda({ S, date, today, now, onOpenJob }: Props) {
  const jobs = jobsOn(S, date)
  const lead = (j: Job) => j.members.find((m) => m.is_acting_lead) ?? j.members.find((m) => m.role === 'lead')

  return (
    <PanelSection title={date === today ? "Today's agenda" : 'Agenda'} count={jobs.length}>
      {jobs.length === 0 && <p className="text-caption text-ink-3">No jobs this day.</p>}
      <div className="flex flex-col">
        {jobs.map((j) => {
          const tone = atRisk(S, j, date, today, now).length ? 'risk' : checksOf(S, j, date).length ? 'check' : j.status === 'ongoing' ? 'ongoing' : j.status === 'done' ? 'done' : 'planned'
          const l = lead(j), more = j.members.length - 1
          return (
            <button key={j.id} type="button" onClick={() => onOpenJob(j)} className="grid grid-cols-[10px_1fr] gap-x-2 rounded-chip px-1.5 py-1.5 text-left hover:bg-surface-hover">
              <span className={cx('mt-1.5 size-2 rounded-pill', DOT[tone])} />
              <span className="truncate text-small font-medium text-ink">{j.client_name}</span>
              <span className="col-start-2 flex items-center gap-1 text-caption text-ink-2">
                <Clock className="size-3 text-ink-3" aria-hidden />{clock12(j.start_time)} · {l?.name.split(' ')[0] ?? 'No lead'}{more > 0 ? ` +${more}` : ''}
              </span>
            </button>
          )
        })}
      </div>
    </PanelSection>
  )
}
