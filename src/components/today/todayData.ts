// Reads for the Coordinator's Today board (Work v2): today's jobs and who's on them, today's work days,
// approved leave today, the review list (selfie time-ins, no time-outs…), overtime asks, and selfie links.
import { createClient } from '@/lib/supabase/client'
import { manilaToday } from '@/components/jobs/jobTypes'

type Client = ReturnType<typeof createClient>

export type TodayJob = {
  id: string; client_name: string; start_time: string; end_time: string; report_to: 'site' | 'hq'
  members: { person_id: string; name: string; role: string; is_acting_lead: boolean; level: string | null }[]
}
export type WorkDay = {
  id: string; person_id: string; work_date: string; job_id: string | null; place_name: string; time_in: string; time_out: string | null
  late_minutes: number; in_check: string; in_reason: string | null; selfie_path: string | null; out_check: string | null
  hours: number | null; status: string; name: string
}
export type Review = { id: string; kind: string; note: string | null; created_at: string; work_day: WorkDay }
export type OvertimeAsk = { id: string; person_id: string; requested_hours: number; reason: string | null; request_date: string; name: string }

const WD_FIELDS = 'id, person_id, work_date, job_id, place_name, time_in, time_out, late_minutes, in_check, in_reason, selfie_path, out_check, hours, status, person:profiles!work_days_person_id_fkey ( full_name )'
const withName = (w: Record<string, unknown>) => ({ ...w, name: (w.person as { full_name?: string } | null)?.full_name ?? 'Unknown' }) as unknown as WorkDay

export async function loadToday(supabase: Client) {
  const today = manilaToday()
  const [jobs, days, leaves, reviews, overtime] = await Promise.all([
    supabase.from('jobs')
      .select('id, client_name, start_time, end_time, report_to, job_members ( person_id, role, is_acting_lead, removed_at, person:profiles!job_members_person_id_fkey ( full_name, technician_level ) )')
      .in('status', ['planned', 'ongoing']).lte('start_date', today).gte('end_date', today).order('start_time'),
    // Today's days, plus any earlier day still without a time-out
    supabase.from('work_days').select(WD_FIELDS).or(`work_date.eq.${today},time_out.is.null`).order('time_in'),
    supabase.from('leaves').select('technician_id, leave_type').eq('status', 'approved').lte('start_date', today).gte('end_date', today),
    supabase.from('reviews').select(`id, kind, note, created_at, work_day:work_days ( ${WD_FIELDS} )`).eq('status', 'pending').order('created_at'),
    supabase.from('overtime_requests').select('id, technician_id, requested_hours, reason, request_date, person:profiles!overtime_requests_technician_id_fkey ( full_name )')
      .eq('status', 'pending').not('work_day_id', 'is', null).order('created_at'),
  ])
  const failed = jobs.error || days.error || leaves.error || reviews.error || overtime.error
  if (failed) throw failed

  return {
    today,
    jobs: (jobs.data ?? []).map((j) => ({
      id: j.id, client_name: j.client_name, start_time: j.start_time, end_time: j.end_time, report_to: j.report_to as 'site' | 'hq',
      members: (j.job_members ?? []).filter((m) => !m.removed_at && m.person_id).map((m) => {
        const p = m.person as { full_name?: string; technician_level?: string | null } | null
        return { person_id: m.person_id!, role: m.role, is_acting_lead: m.is_acting_lead, name: p?.full_name ?? 'Unknown', level: p?.technician_level ?? null }
      }),
    })) as TodayJob[],
    days: (days.data ?? []).map((d) => withName(d as Record<string, unknown>)),
    onLeave: new Map((leaves.data ?? []).map((l) => [l.technician_id, l.leave_type as string])),
    reviews: (reviews.data ?? []).filter((r) => r.work_day).map((r) => ({
      id: r.id, kind: r.kind, note: r.note, created_at: r.created_at, work_day: withName(r.work_day as unknown as Record<string, unknown>),
    })) as Review[],
    overtime: (overtime.data ?? []).map((o) => ({
      id: o.id, person_id: o.technician_id, requested_hours: Number(o.requested_hours), reason: o.reason, request_date: o.request_date,
      name: (o.person as { full_name?: string } | null)?.full_name ?? 'Unknown',
    })) as OvertimeAsk[],
  }
}

export type TodayData = Awaited<ReturnType<typeof loadToday>>

/** Where the face a person enrolled on their phone is stored (same private bucket as selfies), or null. */
export async function enrolledFacePath(supabase: Client, personId: string): Promise<string | null> {
  const { data } = await supabase.from('face_enrollments').select('photo_path').eq('person_id', personId).maybeSingle()
  return data?.photo_path ?? null
}

/** A 5-minute link to a time-in selfie (private bucket; office staff may open them). */
export async function selfieLink(supabase: Client, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('dtr-selfies').createSignedUrl(path, 300)
  return data?.signedUrl ?? null
}

/** Calls `onChange` when a work day, review or overtime ask changes. Returns the unsubscribe. */
export function watchToday(supabase: Client, onChange: () => void): () => void {
  const channel = supabase.channel(`today-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'work_days' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'overtime_requests' }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
