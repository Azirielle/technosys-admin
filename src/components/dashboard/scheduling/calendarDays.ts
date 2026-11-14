// Month calendar maths: the grid of days (weeks start Monday) and, for one day, its jobs and who is free.
import type { ProfileItem, ScheduleItem } from './types'

const TWO_HOURS = 2 * 3600000
const THIRTY_DAYS = 30 * 86400000

/** Day numbers for the month, with nulls before day 1 so the 1st lands under its weekday (Mon first). */
export function monthCells(year: number, month: number) {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
}

export interface DayInfo {
  jobs: ScheduleItem[]
  outOfTown: ScheduleItem[]
  onSite: ScheduleItem[]
  office: ScheduleItem[]
  booked: ProfileItem[]
  free: ProfileItem[]
  onLeave: ProfileItem[]
  total: number
}

/** Jobs that touch this day (out-of-town jobs span many days) and the field staff booked, free or on leave. */
export function dayInfo(schedules: ScheduleItem[], staff: ProfileItem[], year: number, month: number, day: number): DayInfo {
  const from = new Date(year, month, day, 0, 0, 0, 0).getTime()
  const to = new Date(year, month, day, 23, 59, 59, 999).getTime()
  const jobs = schedules.filter((s) => {
    if (s.status === 'cancelled') return false
    const start = new Date(s.start_time).getTime()
    const end =
      s.assignment_type === 'deployment'
        ? s.end_time
          ? new Date(s.end_time).getTime()
          : s.target_review_date
            ? new Date(s.target_review_date).getTime()
            : start + THIRTY_DAYS
        : s.end_time
          ? new Date(s.end_time).getTime()
          : start + TWO_HOURS
    return start <= to && end >= from
  })
  const bookedIds = new Set<string>()
  for (const j of jobs) {
    if (j.technician_id) bookedIds.add(j.technician_id)
    j.schedule_crew_assignments?.forEach((c) => c.status === 'active' && c.technician_id && bookedIds.add(c.technician_id))
  }
  const active = staff.filter((t) => t.lifecycle_status !== 'archived' && t.lifecycle_status !== 'terminated')
  return {
    jobs,
    outOfTown: jobs.filter((j) => j.assignment_type === 'deployment'),
    onSite: jobs.filter((j) => !j.assignment_type || j.assignment_type === 'on_site'),
    office: jobs.filter((j) => j.assignment_type === 'office_duty'),
    booked: active.filter((t) => bookedIds.has(t.id)),
    free: active.filter((t) => !bookedIds.has(t.id) && t.lifecycle_status !== 'on_leave'),
    onLeave: active.filter((t) => t.lifecycle_status === 'on_leave'),
    total: active.length,
  }
}
