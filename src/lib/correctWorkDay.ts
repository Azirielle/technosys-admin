// Work v2: HR's DTR correction of one work day (or adding a missing day), done by hr_correct_work_day in the
// database so late minutes and hours follow the same rules as the phone. Used by app/actions/audit-corrections.ts.
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MESSAGES: Record<string, string> = {
  need_reason: 'Please write a reason of at least 10 characters.',
  bad_time: 'Time out must be after time in.',
  not_found: 'That work day could not be found.',
}

export async function correctWorkDay(
  input: { timeLogId?: string | null; technicianId: string; targetDate: string },
  timeIn: Date, timeOut: Date, reason: string,
): Promise<{ success: boolean; error?: string; timeLogId?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('hr_correct_work_day', {
    p_work_day_id: input.timeLogId || null, p_person_id: input.technicianId, p_date: input.targetDate,
    p_time_in: timeIn.toISOString(), p_time_out: timeOut.toISOString(), p_reason: reason,
  } as never)
  if (error) return { success: false, error: error.message === 'HR only' ? 'Only HR can correct the DTR.' : error.message }
  const result = data as { status: string; work_day_id?: string }
  if (result.status !== 'saved') return { success: false, error: MESSAGES[result.status] ?? 'Could not save the correction.' }
  revalidatePath('/hr/audit')
  revalidatePath('/hr')
  return { success: true, timeLogId: result.work_day_id }
}
