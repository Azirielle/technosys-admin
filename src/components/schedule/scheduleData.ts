// Reads for the Coordinator's Scheduling page (Work v2): jobs (via jobsData), leave that is approved or waiting
// for HR, work days (time-ins) between two dates, and the temporary workers register.
import { createClient } from '@/lib/supabase/client'

type Client = ReturnType<typeof createClient>

export type LeaveDay = { person_id: string; type: string; start_date: string; end_date: string; pending: boolean }
export type DayLog = { person_id: string; work_date: string; time_in: string; time_out: string | null; late_minutes: number; status: string }
export type OfficeLog = { person_id: string; work_date: string; checked_in_at: string }
export type TempWorkerItem = { id: string; full_name: string; contact_number: string; emergency_contact: string | null; notes: string | null; status: string }

/** Leave (approved or waiting for HR), work days and office check-ins that touch the dates from..to. */
export async function loadLeaveAndDays(supabase: Client, from: string, to: string): Promise<{ leaves: LeaveDay[]; days: DayLog[]; officeCheckIns: OfficeLog[] }> {
  const [leaves, days, office] = await Promise.all([
    supabase.from('leaves').select('technician_id, leave_type, start_date, end_date, status')
      .in('status', ['approved', 'pending']).lte('start_date', to).gte('end_date', from),
    supabase.from('work_days').select('person_id, work_date, time_in, time_out, late_minutes, status')
      .gte('work_date', from).lte('work_date', to),
    supabase.from('office_check_ins').select('person_id, work_date, checked_in_at')
      .gte('work_date', from).lte('work_date', to),
  ])
  if (leaves.error) throw leaves.error
  if (days.error) throw days.error
  return {
    leaves: (leaves.data ?? []).map((l) => ({
      person_id: l.technician_id, type: cap(String(l.leave_type).replace(/_/g, ' ')), start_date: l.start_date.slice(0, 10), end_date: l.end_date.slice(0, 10), pending: l.status === 'pending',
    })),
    days: (days.data ?? []) as DayLog[],
    officeCheckIns: (office.data ?? []) as OfficeLog[],
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Everyone in the temporary workers register (active and inactive). */
export async function loadTempWorkers(supabase: Client): Promise<TempWorkerItem[]> {
  const { data, error } = await supabase.from('casual_helpers').select('id, full_name, contact_number, emergency_contact, notes, status').order('full_name')
  if (error) throw error
  return (data ?? []).map((t) => ({ ...t, status: t.status ?? 'active' })) as TempWorkerItem[]
}

/** Calls `onChange` when a job, a crew list or a work day changes. Returns the unsubscribe. */
export function watchSchedule(supabase: Client, onChange: () => void): () => void {
  const channel = supabase.channel(`schedule-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'job_members' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'work_days' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'office_check_ins' }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
