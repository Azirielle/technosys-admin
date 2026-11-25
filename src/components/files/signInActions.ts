// Reads and writes for a field worker's mobile sign-in: their 4-digit PIN and their one registered phone.
// The database functions check that the caller is HR or the CEO (set_login_pin, decide_phone_change…).
import { createClient } from '@/lib/supabase/client'
import { logAdminActivity } from '@/lib/auditLogger'
import { notifyPhoneDecision, notifyPinChanged } from '@/app/actions/notifications'

type Client = ReturnType<typeof createClient>

export type PhoneRequest = { id: string; device_name: string | null; requested_at: string }
export type SignInInfo = {
  pin: { has_pin: boolean; updated_at: string; locked: boolean } | null
  phone: { device_name: string | null; registered_at: string; last_seen_at: string } | null
  request: PhoneRequest | null
}

function log(action: string, target: string) {
  logAdminActivity({ adminName: '', adminRole: '', adminRoleKey: 'hr', moduleKey: 'hr_files', moduleName: '201 Files', action, targetEntity: target })
}

export async function loadSignInInfo(supabase: Client, profileId: string): Promise<SignInInfo> {
  const [pin, phone, request] = await Promise.all([
    supabase.rpc('login_pin_status', { p_profile_id: profileId }),
    supabase.from('registered_devices').select('device_name, registered_at, last_seen_at').eq('profile_id', profileId).maybeSingle(),
    supabase.from('device_change_requests').select('id, device_name, requested_at').eq('profile_id', profileId).eq('status', 'pending').maybeSingle(),
  ])
  const failed = pin.error || phone.error || request.error
  if (failed) throw failed
  return { pin: (pin.data as SignInInfo['pin']) ?? null, phone: phone.data ?? null, request: request.data ?? null }
}

/** Ids of people waiting for HR to approve a new phone. */
export async function loadPendingPhoneRequests(supabase: Client): Promise<Set<string>> {
  const { data, error } = await supabase.from('device_change_requests').select('profile_id').eq('status', 'pending')
  if (error) throw error
  return new Set((data ?? []).map((r) => r.profile_id))
}

/** Returns an error sentence, or null when saved. */
export async function setPin(supabase: Client, profileId: string, name: string, pin: string): Promise<string | null> {
  if (!/^[0-9]{4}$/.test(pin)) return 'The PIN must be exactly 4 numbers.'
  if (/^(\d)\1{3}$/.test(pin) || ['1234', '4321', '0123', '9876'].includes(pin)) return 'Pick a PIN that is harder to guess than this one.'
  const { error } = await supabase.rpc('set_login_pin', { p_profile_id: profileId, p_pin: pin })
  if (error) return error.message
  log('Set mobile PIN', name)
  notifyPinChanged(profileId).catch(() => {}) // SMS notice only, never the PIN
  return null
}

export async function decidePhoneRequest(supabase: Client, requestId: string, approve: boolean, name: string) {
  const { error } = await supabase.rpc('decide_phone_change', { p_request_id: requestId, p_approve: approve })
  if (error) throw error
  log(approve ? 'Approved new phone' : 'Declined new phone', name)
  notifyPhoneDecision(requestId).catch(() => {})
}

export async function resetPhone(supabase: Client, profileId: string, name: string) {
  const { error } = await supabase.rpc('reset_registered_phone', { p_profile_id: profileId })
  if (error) throw error
  log('Reset registered phone', name)
}

/** Deletes the face they enrolled; their next time-in asks them to save it again (CONSULTATION_FIXES B15). */
export async function resetFace(supabase: Client, profileId: string, name: string) {
  const { error } = await supabase.from('face_enrollments').delete().eq('person_id', profileId)
  if (error) throw error
  log('Reset enrolled face', name)
}
