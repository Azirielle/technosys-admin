// Work v2 for HR's DTR (app/actions/audit.ts): this cut-off's work days and jobs, shaped like the old
// attendance_logs and schedules rows the DTR already reads. Hours come from the database (from the start time
// to the end time + approved overtime, minus lunch), so the DTR matches the phone and the Today board.
// WORK_V2 is on since the switch-over on 2026-11-17 (PROJECT_STATE.md §8), the same as the mobile app's switch.
import { supabaseAdmin } from '@/lib/supabase/admin'

export const WORK_V2 = true

export type V2Log = {
  id: string; technician_id: string; app_time_in: string; app_time_out: string | null; total_hours: number | null
  status: string; is_manual_entry: boolean; is_mocked: boolean; gps_accuracy: number | null; is_suspicious: boolean
}
export type V2Job = { id: string; technician_id: string; client_name: string; location: string; start_time: string; end_time: string; status: string; work_type?: string | null }

const at = (date: string, time: string) => new Date(`${date}T${time.slice(0, 8)}+08:00`).toISOString()

export async function loadWorkV2(profileIds: string[], startDate: string, endDate: string): Promise<{ logs: V2Log[]; jobs: V2Job[] }> {
  const [days, members] = await Promise.all([
    supabaseAdmin.from('work_days')
      .select('id, person_id, work_date, time_in, time_out, hours, status, in_check, is_mocked, in_accuracy_m, out_check')
      .in('person_id', profileIds).gte('work_date', startDate).lte('work_date', endDate).order('time_in'),
    supabaseAdmin.from('job_members')
      .select('person_id, jobs!inner ( id, client_name, address, start_date, end_date, start_time, end_time, status, work_type )')
      .in('person_id', profileIds).is('removed_at', null)
      .lte('jobs.start_date', endDate).gte('jobs.end_date', startDate).neq('jobs.status', 'cancelled'),
  ])
  if (days.error) throw days.error
  if (members.error) throw members.error

  const logs: V2Log[] = (days.data ?? []).map((d) => ({
    id: d.id, technician_id: d.person_id, app_time_in: d.time_in, app_time_out: d.time_out,
    total_hours: d.hours != null ? Number(d.hours) : null,
    // "pending_close" is how the DTR shows "HR to check"
    status: d.status === 'needs_review' || d.status === 'no_time_out' ? 'pending_close' : d.time_out ? 'closed' : 'active',
    is_manual_entry: d.out_check === 'by_coordinator' || d.out_check === 'told_later',
    is_mocked: d.is_mocked, gps_accuracy: d.in_accuracy_m, is_suspicious: d.in_check === 'selfie' && d.status === 'needs_review', // only until the Coordinator or HR checks it
  }))

  // One row per person per day of each job inside the cut-off
  const jobs: V2Job[] = []
  for (const m of members.data ?? []) {
    const j = m.jobs as unknown as { id: string; client_name: string; address: string; start_date: string; end_date: string; start_time: string; end_time: string; status: string; work_type?: string | null }
    for (let ms = Date.parse(`${j.start_date > startDate ? j.start_date : startDate}T00:00:00Z`); ms <= Date.parse(`${j.end_date < endDate ? j.end_date : endDate}T00:00:00Z`); ms += 86400000) {
      const date = new Date(ms).toISOString().slice(0, 10)
      jobs.push({ id: j.id, technician_id: m.person_id!, client_name: j.client_name, location: j.address, start_time: at(date, j.start_time), end_time: at(date, j.end_time), status: j.status, work_type: j.work_type })
    }
  }
  return { logs, jobs }
}
