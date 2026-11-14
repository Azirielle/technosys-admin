// teamConflicts: for each person, the job (if any) they're already on at the chosen date and time.
import { formatLocalDate, type ProfileItem, type ScheduleItem } from './types'
import { timeOf } from './jobLabels'

/** person id → short sentence like "On SM Southmall, 9:00 AM–5:00 PM". Missing = free. */
export function busyWith(profiles: ProfileItem[], jobs: ScheduleItem[], date?: string, start?: string, end?: string) {
  const busy = new Map<string, string>()
  if (!date) return busy
  for (const p of profiles) {
    const clash = jobs.find((s) => {
      if (s.status === 'cancelled') return false
      const onIt = s.technician_id === p.id || s.senior_partner_id === p.id || s.schedule_crew_assignments?.some((c) => c.technician_id === p.id && c.status === 'active')
      if (!onIt || formatLocalDate(new Date(s.start_time)) !== date) return false
      // Same day counts as busy unless both have times and they don't overlap.
      if (start && end && s.end_time) {
        const from = new Date(`${date}T${start}:00`)
        const to = new Date(`${date}T${end}:00`)
        return from < new Date(s.end_time) && to > new Date(s.start_time)
      }
      return true
    })
    if (clash) busy.set(p.id, `On ${clash.client_name || 'another job'}, ${timeOf(clash.start_time)}${clash.end_time ? `–${timeOf(clash.end_time)}` : ''}`)
  }
  return busy
}
