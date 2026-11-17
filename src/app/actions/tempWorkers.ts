"use server"
// Temporary workers (table casual_helpers): helpers hired per job who don't use the app. The Coordinator adds,
// edits and turns them on or off; the job form picks the active ones.
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"
import { verifyRoleAccess } from "@/lib/permissions"

export type TempWorkerInput = { fullName: string; contactNumber: string; emergencyContact?: string; notes?: string }
type Result = { ok: true } | { ok: false; error: string }

export async function saveTempWorker(input: TempWorkerInput, id?: string): Promise<Result> {
  if (!(await verifyRoleAccess('schedules', true)).authorized) return { ok: false, error: 'Only the Coordinator can change temporary workers.' }
  const name = input.fullName.trim(), phone = input.contactNumber.trim()
  if (!name || !phone) return { ok: false, error: 'Enter a name and a mobile number.' }
  const row = { full_name: name, contact_number: phone, emergency_contact: input.emergencyContact?.trim() || null, notes: input.notes?.trim() || null }
  const { error } = id
    ? await supabaseAdmin.from('casual_helpers').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id)
    : await supabaseAdmin.from('casual_helpers').insert({ ...row, status: 'active' })
  if (error) return { ok: false, error: error.message }
  await logActivity(id ? 'update_casual_helper' : 'create_casual_helper', 'casual_helpers', `${id ? 'Updated' : 'Added'} temporary worker "${name}"`)
  revalidatePath('/coordinator/jobs')
  return { ok: true }
}

export async function setTempWorkerActive(id: string, active: boolean): Promise<Result> {
  if (!(await verifyRoleAccess('schedules', true)).authorized) return { ok: false, error: 'Only the Coordinator can change temporary workers.' }
  const { error } = await supabaseAdmin.from('casual_helpers').update({ status: active ? 'active' : 'inactive', updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  await logActivity('update_casual_helper', 'casual_helpers', `Set temporary worker ${active ? 'active' : 'inactive'}`)
  revalidatePath('/coordinator/jobs')
  return { ok: true }
}
