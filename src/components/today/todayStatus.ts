// What each person on today's jobs is doing right now, in plain words, from their work day and the job's
// start time: not yet → due (within 15 min of start) → missing (after 15 min); in / late / needs review / done.
import type { Tone } from '@/components/ui'
import type { TodayJob, WorkDay } from './todayData'

export type Row = {
  person_id: string; name: string; role: string; is_acting_lead: boolean; level: string | null
  job: TodayJob | null; day: WorkDay | null; state: State; office_check_in_at?: string | null
}
export type State = 'not_yet' | 'due' | 'missing' | 'on_leave' | 'in' | 'late' | 'review' | 'done' | 'no_time_out' | 'in_house' | 'at_office'

export const STATE_LABEL: Record<State, { label: string; tone: Tone }> = {
  not_yet: { label: 'Not yet', tone: 'neutral' },
  due: { label: 'Due now', tone: 'info' },
  missing: { label: 'Missing', tone: 'danger' },
  on_leave: { label: 'On leave', tone: 'neutral' },
  in: { label: 'In', tone: 'success' },
  late: { label: 'Late', tone: 'warning' },
  review: { label: 'Needs review', tone: 'warning' },
  done: { label: 'Timed out', tone: 'neutral' },
  no_time_out: { label: 'No time-out', tone: 'danger' },
  in_house: { label: 'In-house', tone: 'neutral' },
  at_office: { label: 'At office', tone: 'info' },
}

/** Manila date + "HH:MM:SS" as a real moment */
const at = (date: string, time: string) => new Date(`${date}T${time.slice(0, 8)}+08:00`).getTime()

export function stateOf(job: TodayJob | null, day: WorkDay | null, today: string, onLeave: boolean, officeCheckInAt?: string | null, now = Date.now()): State {
  if (day) {
    if (day.status === 'no_time_out') return 'no_time_out'
    if (day.status === 'needs_review') return 'review'
    if (day.time_out) return 'done'
    return day.late_minutes > 0 ? 'late' : 'in'
  }
  if (officeCheckInAt) return 'at_office'
  if (onLeave) return 'on_leave'
  if (job?.work_type === 'in_house') return 'in_house'
  if (!job) return 'not_yet'
  const start = at(today, job.start_time)
  if (now > start + 15 * 60000) return 'missing'
  if (now > start - 60 * 60000) return 'due'
  return 'not_yet'
}

/** Everyone on today's jobs, plus anyone who timed in today without a job (office duty). Problems first. */
export function buildRows(jobs: TodayJob[], days: WorkDay[], onLeave: Map<string, string>, today: string, officeCheckIns?: Map<string, string>): Row[] {
  const todays = days.filter((d) => d.work_date === today)
  const rows: Row[] = []
  for (const job of jobs) {
    for (const m of job.members) {
      const day = todays.find((d) => d.person_id === m.person_id) ?? null
      const officeCheckInAt = !day ? officeCheckIns?.get(m.person_id) ?? null : null
      rows.push({ ...m, job, day, state: stateOf(job, day, today, onLeave.has(m.person_id), officeCheckInAt), office_check_in_at: officeCheckInAt })
    }
  }
  for (const d of todays.filter((d) => !rows.some((r) => r.person_id === d.person_id))) {
    rows.push({ person_id: d.person_id, name: d.name, role: 'office', is_acting_lead: false, level: null, job: null, day: d, state: stateOf(null, d, today, false) })
  }
  const order: State[] = ['missing', 'no_time_out', 'review', 'late', 'due', 'at_office', 'in', 'not_yet', 'in_house', 'done', 'on_leave']
  return rows.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || a.name.localeCompare(b.name))
}

/** Jobs whose lead hasn't timed in 15 minutes after the start and has no acting lead yet. */
export function jobsNeedingActingLead(jobs: TodayJob[], rows: Row[]): TodayJob[] {
  return jobs.filter((j) => {
    const lead = rows.find((r) => r.job?.id === j.id && r.role === 'lead')
    const acting = j.members.some((m) => m.is_acting_lead)
    return !acting && lead && (lead.state === 'missing' || lead.state === 'on_leave')
  })
}
