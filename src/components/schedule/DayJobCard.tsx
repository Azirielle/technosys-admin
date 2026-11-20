// DayJobCard: one job in one person's column on the Day board, as a small box at its start time (like the FieldCamp
// reference): the client, the time from–to, and their role and who they're with. White with a status stripe on the
// left; a red or yellow outline and dot when something's wrong (the reason and the address are in the tooltip).
// A job with several people shows a card in each column; hovering one outlines them all.
'use client'

import { cx } from '@/components/ui'
import type { Job } from '@/components/jobs/jobTypes'
import { atRisk, checksOf, clock12, roleOn, type Sched } from './scheduleMath'
import { JOB_STATUS_WORD, JOB_TONE } from './scheduleStyles'
import { VipTag } from '@/components/jobs/VipTag'

type Props = {
  S: Sched; job: Job; personId: string; personName: string; date: string; today: string; now: number
  top: number; height: number; lane: number; lanes: number; clashWith?: Job[]; highlighted: boolean
  onHover: (jobId: string | null) => void; onOpen: (job: Job) => void
}

const ROLE: Record<string, string> = { lead: 'Lead', crew: 'Crew', driver: 'Driver', helper: 'Helper' }

export function DayJobCard({ S, job: j, personId, personName, date, today, now, top, height, lane, lanes, clashWith, highlighted, onHover, onOpen }: Props) {
  const role = roleOn(j, personId)
  const others = j.members.filter((m) => m.person_id !== personId)
  const lead = j.members.find((m) => m.is_acting_lead) ?? j.members.find((m) => m.role === 'lead')
  const with_ = others.length === 0 ? 'Alone' : `with ${others.slice(0, 1).map((m) => m.name.split(' ')[0] + (m === lead ? ' (lead)' : '')).join('')}${others.length > 1 ? ` +${others.length - 1}` : ''}`
  const late = atRisk(S, j, date, today, now).includes(personName)
  const check = checksOf(S, j, date).find((c) => c.startsWith(personName))
  const problem = clashWith ? { text: `Clash with ${clashWith[0].client_name}`, danger: true }
    : late ? { text: 'Not timed in', danger: true }
    : check ? { text: check.includes('lead') ? 'Helper as lead' : 'Leave waiting for HR', danger: false } : null
  const status = JOB_STATUS_WORD[j.status]
  const tip = [j.client_name, `${clock12(j.start_time)} – ${clock12(j.end_time)}`, j.address, status, problem?.text].filter(Boolean).join(' · ')

  return (
    <button type="button" onClick={() => onOpen(j)} onMouseEnter={() => onHover(j.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(j.id)} onBlur={() => onHover(null)}
      title={tip}
      className={cx('absolute z-[1] flex flex-col justify-center overflow-hidden rounded-control px-2 py-1 text-left shadow-card', JOB_TONE[j.status],
        problem?.danger ? 'ring-2 ring-inset ring-danger' : problem ? 'ring-2 ring-inset ring-warning' : '',
        highlighted && 'shadow-raised outline outline-2 outline-offset-1 outline-info')}
      style={{ top: top + 2, height: height - 4, left: `calc(${(lane / lanes) * 100}% + 4px)`, width: `calc(${100 / lanes}% - 8px)` }}>
      <span className="flex items-start gap-1">
        {j.is_vip && <VipTag />}<b className="min-w-0 flex-1 truncate text-caption font-semibold text-ink">{j.client_name}</b>
        {(problem || status) && <span className={cx('mt-1 size-1.5 shrink-0 rounded-pill', problem ? (problem.danger ? 'bg-danger' : 'bg-warning') : j.status === 'done' ? 'bg-success' : 'bg-info')} aria-hidden />}
      </span>
      <span className="truncate text-micro tabular-nums text-ink-2">{clock12(j.start_time)} – {clock12(j.end_time)}</span>
      <span className="truncate text-micro text-ink-2">{role && <b className="font-semibold text-ink">{ROLE[role]}</b>}{role ? ' · ' : ''}{with_}</span>
    </button>
  )
}
