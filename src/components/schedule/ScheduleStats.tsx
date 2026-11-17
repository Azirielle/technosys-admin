// ScheduleStats: one line about the day shown, each number with a small icon (like the reference): jobs, crew
// hours, in progress, done, who is working, free or on leave, and how many jobs are at risk or need a check.
import type { LucideIcon } from 'lucide-react'
import { Activity, AlertCircle, AlertTriangle, CalendarDays, CalendarOff, CheckCircle2, Clock, UserCheck, Users } from 'lucide-react'
import { cx } from '@/components/ui'
import { atRisk, checksOf, hoursOf, isFree, jobsOn, onLeave, type Sched } from './scheduleMath'

export function ScheduleStats({ S, date, today, now }: { S: Sched; date: string; today: string; now: number }) {
  const jobs = jobsOn(S, date), total = S.people.length
  const free = S.people.filter((p) => isFree(S, p.id, date)).length
  const leave = S.people.filter((p) => onLeave(S, p.id, date)).length
  const hours = S.people.reduce((h, p) => h + hoursOf(S, p.id, date), 0)
  const risk = jobs.filter((j) => atRisk(S, j, date, today, now).length).length
  const checks = jobs.filter((j) => checksOf(S, j, date).length).length
  const item = (Icon: LucideIcon, n: number | string, label: string, cls = 'text-ink') => (
    <span className="flex items-center gap-1.5"><Icon className={cx('size-3.5', cls === 'text-ink' ? 'text-ink-3' : cls)} aria-hidden /><b className={cx('tabular-nums', cls)}>{n}</b> {label}</span>
  )

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-2">
      {item(CalendarDays, jobs.length, jobs.length === 1 ? 'job' : 'jobs')}
      {item(Clock, Math.round(hours), 'crew hrs')}
      {item(Activity, jobs.filter((j) => j.status === 'ongoing').length, 'in progress')}
      {item(CheckCircle2, jobs.filter((j) => j.status === 'done').length, 'done')}
      {item(Users, `${total - free - leave} of ${total}`, 'working')}
      {item(UserCheck, free, 'free')}
      {item(CalendarOff, leave, 'on leave')}
      {risk > 0 && item(AlertCircle, risk, 'at risk', 'text-danger')}
      {checks > 0 && item(AlertTriangle, checks, 'to check', 'text-warning')}
    </div>
  )
}
