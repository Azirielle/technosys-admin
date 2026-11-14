// findConflicts: jobs that share a person at overlapping times (the same technician booked twice).
import type { ScheduleItem } from './types'

const DEFAULT_JOB_MS = 2 * 3600000 // a job with no end time counts as 2 hours

function peopleOn(job: ScheduleItem) {
  const ids = new Set<string>()
  if (job.technician_id) ids.add(job.technician_id)
  job.schedule_crew_assignments?.forEach((c) => {
    if (c.status === 'active' && c.technician_id) ids.add(c.technician_id)
  })
  return ids
}

function window(job: ScheduleItem) {
  const start = new Date(job.start_time).getTime()
  return { start, end: job.end_time ? new Date(job.end_time).getTime() : start + DEFAULT_JOB_MS }
}

/** IDs of every job that clashes with another job. Cancelled jobs are ignored. */
export function findConflicts(items: ScheduleItem[]): Set<string> {
  const jobs = items.filter((s) => s.status !== 'cancelled').map((s) => ({ job: s, people: peopleOn(s), ...window(s) }))
  const clashing = new Set<string>()
  for (let i = 0; i < jobs.length; i++) {
    if (jobs[i].people.size === 0) continue
    for (let j = i + 1; j < jobs.length; j++) {
      const a = jobs[i]
      const b = jobs[j]
      const overlap = a.start < b.end && a.end > b.start
      if (overlap && [...b.people].some((id) => a.people.has(id))) {
        clashing.add(a.job.id)
        clashing.add(b.job.id)
      }
    }
  }
  return clashing
}
