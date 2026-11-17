// NeedsYou: the day's problems in plain words, each with the next step as a button: call the person, replace
// someone or change the lead (opens the job form), or pick an acting lead on the Today board. Red first.
// HR's read-only view shows the problems with only "Call" and "Open job".
'use client'

import Link from 'next/link'
import { Phone } from 'lucide-react'
import { cx } from '@/components/ui'
import type { Job } from '@/components/jobs/jobTypes'
import type { Sched } from './scheduleMath'
import { needsOf, type NeedAction } from './scheduleStatus'
import { PanelSection } from './PanelSection'

type Props = { S: Sched; date: string; today: string; now: number; readOnly: boolean; onOpenJob: (job: Job) => void; onEditJob: (job: Job) => void }

const BTN = 'inline-flex items-center gap-1 rounded-pill bg-surface px-2.5 py-1 text-micro font-semibold text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-hover'

export function NeedsYou({ S, date, today, now, readOnly, onOpenJob, onEditJob }: Props) {
  const needs = needsOf(S, date, today, now)
  if (!needs.length) return null

  function action(a: NeedAction, i: number) {
    if (a.kind === 'call') return <a key={i} href={`tel:${a.phone}`} className={BTN}><Phone className="size-3" aria-hidden />{a.label}</a>
    if (a.kind === 'today') return readOnly ? null : <Link key={i} href="/coordinator/today" className={BTN}>{a.label}</Link>
    if (readOnly) return <button key={i} type="button" className={BTN} onClick={() => onOpenJob(a.job)}>Open job</button>
    return <button key={i} type="button" className={BTN} onClick={() => (a.kind === 'edit' ? onEditJob(a.job) : onOpenJob(a.job))}>{a.label}</button>
  }

  return (
    <PanelSection title="Needs you" count={needs.length} countTone={needs.some((n) => n.tone === 'danger') ? 'danger' : undefined}>
      {needs.map((n) => (
        <div key={n.key} className={cx('flex flex-col gap-2 rounded-chip px-2.5 py-2 text-caption', n.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning')}>
          <p>{n.text}</p>
          {n.actions.length > 0 && <div className="flex flex-wrap gap-1.5">{n.actions.map(action)}</div>}
        </div>
      ))}
    </PanelSection>
  )
}
