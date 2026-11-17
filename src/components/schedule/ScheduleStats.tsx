// ScheduleStats: one line about the day shown: jobs, crew hours, who is working, free or on leave, and how many
// jobs are at risk or need a check.
import { atRisk, checksOf, hoursOf, isFree, jobsOn, onLeave, type Sched } from './scheduleMath'

export function ScheduleStats({ S, date, today, now }: { S: Sched; date: string; today: string; now: number }) {
  const jobs = jobsOn(S, date), total = S.people.length
  const free = S.people.filter((p) => isFree(S, p.id, date)).length
  const leave = S.people.filter((p) => onLeave(S, p.id, date)).length
  const hours = S.people.reduce((h, p) => h + hoursOf(S, p.id, date), 0)
  const risk = jobs.filter((j) => atRisk(S, j, date, today, now).length).length
  const checks = jobs.filter((j) => checksOf(S, j, date).length).length
  const item = (n: number | string, label: string, cls = 'text-ink') => <span><b className={`tabular-nums ${cls}`}>{n}</b> {label}</span>

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-2">
      {item(jobs.length, jobs.length === 1 ? 'job' : 'jobs')}
      {item(Math.round(hours), 'crew hours')}
      {item(`${total - free - leave} of ${total}`, 'working')}
      {item(free, 'free')}
      {item(leave, 'on leave')}
      {risk > 0 && item(risk, 'at risk', 'text-danger')}
      {checks > 0 && item(checks, 'to check', 'text-warning')}
    </div>
  )
}
