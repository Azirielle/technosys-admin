// DayJobsPanel: the table under the Day board (like the reference's Jobs panel): the day's jobs by status
// (All / Planned / In progress / Done / Cancelled) with client, address, kind of work, lead, people and time.
// The arrow folds it down to its tabs so the board gets the room; the choice is remembered on this computer.
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge, cx } from '@/components/ui'
import { WORK_TYPES, type Job, type JobStatus } from '@/components/jobs/jobTypes'
import { atRisk, clock12, type Sched } from './scheduleMath'

type Props = { S: Sched; date: string; today: string; now: number; onOpenJob: (job: Job) => void }
type Show = 'all' | JobStatus

const TABS: { value: Show; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'planned', label: 'Planned' }, { value: 'ongoing', label: 'In progress' },
  { value: 'done', label: 'Done' }, { value: 'cancelled', label: 'Cancelled' },
]
const TONE = { planned: 'neutral', ongoing: 'info', done: 'success', cancelled: 'neutral' } as const
const KEY = 'schedule.jobsPanelOpen'

export function DayJobsPanel({ S, date, today, now, onOpenJob }: Props) {
  const [show, setShow] = useState<Show>('all')
  // Open by default on tall screens; afterwards remember the Coordinator's choice. The panel only appears once the
  // jobs have loaded in the browser, so reading storage here is safe.
  const [open, setOpen] = useState(() => {
    try { const v = localStorage.getItem(KEY); return v ? v === '1' : window.innerHeight >= 900 } catch { return false }
  })
  function toggle(v: boolean) { setOpen(v); try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* ignore */ } }

  const day = S.jobs.filter((j) => j.start_date <= date && j.end_date >= date)
  const count = (s: Show) => day.filter((j) => s === 'all' ? j.status !== 'cancelled' : j.status === s).length
  const rows = day.filter((j) => show === 'all' ? j.status !== 'cancelled' : j.status === show)
  const lead = (j: Job) => j.members.find((m) => m.is_acting_lead) ?? j.members.find((m) => m.role === 'lead')

  return (
    <div className="flex shrink-0 flex-col border-t border-line">
      <div className="flex items-center gap-1 overflow-x-auto px-3">
        <span className="pr-2 text-small font-semibold text-ink">Jobs</span>
        {TABS.map((t) => (
          <button key={t.value} type="button" onClick={() => { setShow(t.value); toggle(true) }}
            className={cx('flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-small', open && show === t.value ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink')}>
            {t.label}<span className="text-caption tabular-nums text-ink-3">{count(t.value)}</span>
          </button>
        ))}
        <button type="button" onClick={() => toggle(!open)} aria-expanded={open} aria-label={open ? 'Fold the jobs table' : 'Show the jobs table'}
          className="ml-auto grid size-7 shrink-0 place-items-center rounded-pill text-ink-2 hover:bg-surface-hover">
          <ChevronDown className={cx('size-4 transition-transform', !open && 'rotate-180')} aria-hidden />
        </button>
      </div>
      {open && (
        <div className="max-h-[30vh] overflow-auto border-t border-line">
          <table className="w-full whitespace-nowrap text-small">
            <thead className="sticky top-0 bg-surface text-left text-caption text-ink-2">
              <tr>{['Client', 'Address', 'Kind of work', 'Lead', 'People', 'Time', 'Status', ''].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-ink-3">No jobs here on this day.</td></tr>}
              {rows.map((j) => {
                const late = atRisk(S, j, date, today, now)
                return (
                  <tr key={j.id} className="hover:bg-surface-hover">
                    <td className="max-w-48 truncate px-3 py-2 font-medium text-ink">{j.client_name}</td>
                    <td className="max-w-64 truncate px-3 py-2 text-ink-2">{j.address}</td>
                    <td className="px-3 py-2 text-ink-2">{WORK_TYPES.find((w) => w.value === j.work_type)?.label ?? j.work_type}</td>
                    <td className="px-3 py-2 text-ink">{lead(j)?.name ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-2">{j.members.length}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-2">{clock12(j.start_time)} – {clock12(j.end_time)}</td>
                    <td className="px-3 py-2">{late.length ? <Badge tone="danger">Not timed in</Badge> : <Badge tone={TONE[j.status]}>{TABS.find((t) => t.value === j.status)?.label}</Badge>}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button type="button" onClick={() => onOpenJob(j)} className="rounded-pill px-3 py-1 text-caption font-semibold text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-hover">Open</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
