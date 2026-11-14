// crewRelease: takes people off a job (cancel, or release from an out-of-town job). Server code only.
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Marks the active crew rows of a job as released. Pass technicianId to release one person only.
 *
 * A crew row's joined_at is the job's start time, and the database requires released_at >= joined_at.
 * So someone taken off a job that hasn't started yet is released at the start time (they never joined),
 * not "now" — otherwise the database refuses the change.
 */
export async function releaseCrew(scheduleId: string, note: string, technicianId?: string) {
  let query = supabaseAdmin
    .from('schedule_crew')
    .select('id, joined_at')
    .eq('schedule_id', scheduleId)
    .eq('status', 'active')
  if (technicianId) query = query.eq('technician_id', technicianId)
  const { data: rows, error } = await query
  if (error) throw error

  const now = Date.now()
  for (const row of rows ?? []) {
    const joined = row.joined_at ? new Date(row.joined_at).getTime() : now
    const { error: updateErr } = await supabaseAdmin
      .from('schedule_crew')
      .update({ status: 'released', released_at: new Date(Math.max(now, joined)).toISOString(), notes: note })
      .eq('id', row.id)
    if (updateErr) throw updateErr
  }
  return rows?.length ?? 0
}
