// Reads for the Coordinator's Jobs page (Work v2): jobs with their people, vehicles, offices, field staff,
// temporary workers, a job's history, and the save checks (job_save_checks in the database).
import { createClient } from '@/lib/supabase/client'
import type { Job, JobMember, Office, Person, SaveCheck, TempWorker, Vehicle } from './jobTypes'

type Client = ReturnType<typeof createClient>

/** Jobs that end on or after `since` (default: 45 days ago), with their people. */
export async function loadJobs(supabase: Client, since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(`id, client_name, address, project_name, notes, site_lat, site_lon, site_radius_m, start_date, end_date,
      start_time, end_time, work_type, report_to, hq_office_id, status, cancel_reason, is_vip, vip_note,
      job_members ( id, role, person_id, temp_worker_id, vehicle_id, is_acting_lead, removed_at,
        person:profiles!job_members_person_id_fkey ( full_name ), temp:casual_helpers ( full_name ) )`)
    .gte('end_date', since)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []).map((j) => {
    const { job_members, ...job } = j as typeof j & { job_members: unknown[] }
    const members = (job_members as Array<Record<string, unknown>>)
      .filter((m) => !m.removed_at)
      .map((m) => {
        const person = m.person as { full_name?: string } | null
        const temp = m.temp as { full_name?: string } | null
        return {
          id: m.id, role: m.role, person_id: m.person_id, temp_worker_id: m.temp_worker_id, vehicle_id: m.vehicle_id,
          is_acting_lead: m.is_acting_lead, name: person?.full_name ?? temp?.full_name ?? 'Unknown',
        } as JobMember
      })
    return { ...(job as unknown as Omit<Job, 'members'>), members }
  })
}

export async function loadFormOptions(supabase: Client): Promise<{ people: Person[]; temps: TempWorker[]; vehicles: Vehicle[]; offices: Office[] }> {
  const [people, temps, vehicles, offices] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, technician_level, contact_number, avatar_url').in('role', ['technician', 'helper'])
      .in('lifecycle_status', ['active', 'on_leave']).order('full_name'),
    supabase.from('casual_helpers').select('id, full_name, contact_number').eq('status', 'active').order('full_name'),
    supabase.from('vehicles').select('id, name, plate, home_office_id, status').order('name'),
    supabase.from('office_locations').select('id, name, latitude, longitude, radius_meters').eq('is_active', true).order('name'),
  ])
  const failed = people.error || temps.error || vehicles.error || offices.error
  if (failed) throw failed
  return {
    people: (people.data ?? []) as Person[],
    temps: (temps.data ?? []) as TempWorker[],
    vehicles: (vehicles.data ?? []) as Vehicle[],
    offices: (offices.data ?? []) as Office[],
  }
}

export type JobEvent = { id: string; kind: string; at: string; reason: string | null; who: string | null; by: string | null }

export async function loadJobEvents(supabase: Client, jobId: string): Promise<JobEvent[]> {
  const { data, error } = await supabase
    .from('job_events')
    .select('id, kind, at, reason, person:profiles!job_events_person_id_fkey ( full_name ), by:profiles!job_events_by_id_fkey ( full_name )')
    .eq('job_id', jobId)
    .order('at', { ascending: false })
    .limit(40)
  if (error) throw error
  return (data ?? []).map((e) => ({
    id: e.id, kind: e.kind, at: e.at, reason: e.reason,
    who: (e.person as { full_name?: string } | null)?.full_name ?? null,
    by: (e.by as { full_name?: string } | null)?.full_name ?? null,
  }))
}

/** The database's save checks for the people and vehicle picked (leave, other jobs, phone, vehicle). */
export async function runSaveChecks(
  supabase: Client,
  p: { personIds: string[]; startDate: string; endDate: string; startTime: string; endTime: string; vehicleId: string | null; excludeJobId?: string },
): Promise<SaveCheck[]> {
  if (!p.startDate || !p.endDate || !p.startTime || !p.endTime) return []
  const { data, error } = await supabase.rpc('job_save_checks', {
    p_person_ids: p.personIds, p_start_date: p.startDate, p_end_date: p.endDate,
    p_start_time: p.startTime, p_end_time: p.endTime,
    p_vehicle_id: p.vehicleId ?? undefined, p_exclude_job_id: p.excludeJobId ?? undefined,
  })
  if (error) throw error
  return (data ?? []) as SaveCheck[]
}
