// Scheduling board math (Work v2): dates, who is on which job on a day, who is free or on leave, each person's
// live status from their work day, and which jobs are at risk (someone not timed in 15 min after the start)
// or need a check (leave waiting for HR, a helper as lead). Plain functions; no database calls.
import type { Job, Person } from '@/components/jobs/jobTypes'
import type { DayLog, LeaveDay, OfficeLog } from './scheduleData'

export type Sched = { jobs: Job[]; leaves: LeaveDay[]; days: DayLog[]; people: Person[]; officeCheckIns?: OfficeLog[] }
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/** The board shows at least 6:00 AM to 7:00 PM, and stretches to fit a job that starts earlier or ends later. */
export const DAY_START = 6
export const DAY_END = 19

// ---------- Dates ("YYYY-MM-DD", Manila) ----------
const utc = (ymd: string) => new Date(`${ymd}T00:00:00Z`)
export const addDays = (ymd: string, n: number) => new Date(utc(ymd).getTime() + n * 86400000).toISOString().slice(0, 10)
/** Monday of the week that holds this day */
export const weekStart = (ymd: string) => addDays(ymd, -((utc(ymd).getUTCDay() + 6) % 7))
export const weekdayShort = (ymd: string) => utc(ymd).toLocaleDateString('en-PH', { weekday: 'short', timeZone: 'UTC' })
export const dayNumber = (ymd: string) => utc(ymd).getUTCDate()
/** "Tue, 17 Nov 2026" */
export const longDate = (ymd: string) => utc(ymd).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
/** "17–23 Nov 2026" */
export const weekLabel = (monday: string) => {
  const sun = addDays(monday, 6), f = (d: string, o: Intl.DateTimeFormatOptions) => utc(d).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' })
  return `${f(monday, { day: 'numeric', month: monday.slice(5, 7) === sun.slice(5, 7) ? undefined : 'short' })}–${f(sun, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ---------- Times ----------
/** Minutes after midnight from "08:30" or "08:30:00" */
export const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
/** "8:30a", "1p" */
export const shortClock = (t: string) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'a' : 'p'}` }
/** "8:30 AM", "4 PM" (for cards and labels people read) */
export const clock12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}` }
/** "HH:MM" in Manila from an ISO moment */
export const manilaClock = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600000).toISOString().slice(11, 16)
/** Minutes after midnight right now, in Manila */
export const manilaNowMinutes = () => { const d = new Date(Date.now() + 8 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes() }

// ---------- Who is doing what ----------
const live = (j: Job) => j.status !== 'cancelled'
export const jobsOn = (S: Sched, date: string) =>
  S.jobs.filter((j) => live(j) && j.start_date <= date && j.end_date >= date).sort((a, b) => mins(a.start_time) - mins(b.start_time))
export const jobsOf = (S: Sched, personId: string, date: string) => jobsOn(S, date).filter((j) => j.members.some((m) => m.person_id === personId))
export const leaveOf = (S: Sched, personId: string, date: string) => S.leaves.find((l) => l.person_id === personId && l.start_date <= date && l.end_date >= date)
export const onLeave = (S: Sched, personId: string, date: string) => !!leaveOf(S, personId, date) && !leaveOf(S, personId, date)!.pending
export const isFree = (S: Sched, personId: string, date: string) => !jobsOf(S, personId, date).length && !onLeave(S, personId, date)
export const dayLogOf = (S: Sched, personId: string, date: string) => S.days.find((d) => d.person_id === personId && d.work_date === date)
export const roleOn = (j: Job, personId: string) => j.members.find((m) => m.person_id === personId)?.role

/** Booked hours that day: start to end of each job (the DTR's lunch rule isn't applied here; in-house has no hours on the board). */
export function hoursOf(S: Sched, personId: string, date: string) {
  return jobsOf(S, personId, date).filter((j) => j.work_type !== 'in_house').reduce((h, j) => h + Math.max(0, mins(j.end_time) - mins(j.start_time)) / 60, 0)
}

/** First and last hour the Day board shows: 6 AM–7 PM, wider if a job that day starts earlier or ends later. */
export function boardHours(S: Sched, date: string): { start: number; end: number } {
  const js = jobsOn(S, date)
  const first = Math.min(DAY_START * 60, ...js.map((j) => mins(j.start_time)))
  const last = Math.max(DAY_END * 60, ...js.map((j) => mins(j.end_time)))
  return { start: Math.floor(first / 60), end: Math.min(24, Math.ceil(last / 60)) }
}

/** Names of the people on this job who should have timed in by now and haven't (today only). */
export function atRisk(S: Sched, j: Job, date: string, today: string, now: number): string[] {
  if (date !== today || j.status === 'done' || j.work_type === 'in_house' || now < mins(j.start_time) + 15) return []
  return j.members.filter((m) => m.person_id && !dayLogOf(S, m.person_id, date) && !onLeave(S, m.person_id, date)).map((m) => m.name)
}

/** Things to check on a job that day: a VIP job took someone from it, leave waiting for HR, a helper as lead. */
export function checksOf(S: Sched, j: Job, date: string): string[] {
  const out: string[] = j.vip_note ? [j.vip_note] : []
  for (const m of j.members) {
    if (!m.person_id) continue
    const l = leaveOf(S, m.person_id, date)
    if (l?.pending) out.push(`${m.name} has ${l.type.toLowerCase()} leave waiting for HR on this day.`)
    if (m.role === 'lead' && S.people.find((p) => p.id === m.person_id)?.role === 'helper') out.push(`${m.name} is a helper. Helpers can't be lead.`)
  }
  return out
}
