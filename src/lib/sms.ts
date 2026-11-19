import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Sends one SMS to a person's mobile number (profiles.contact_number) through the send-sms function (Semaphore),
 * which also records it in transactional_sms_logs. For things a technician must know even without mobile data.
 * Never throws: a failed SMS must not undo the change that triggered it. Server code only, while an office user is signed in.
 */
export async function sendSmsToUser(userId: string, message: string, type: string) {
  try {
    const { data: person } = await supabaseAdmin.from('profiles').select('contact_number').eq('id', userId).single()
    if (!person?.contact_number) return { success: false, error: 'No mobile number' }
    // shortcut: demo profiles have made-up numbers that may belong to real strangers, so only numbers listed in
    // SMS_ALLOWED_NUMBERS (comma-separated, 09…) get texts; set it to * once every profile has a real number
    const allowed = (process.env.SMS_ALLOWED_NUMBERS ?? '').split(',').map((n) => n.trim())
    if (!allowed.includes('*') && !allowed.includes(person.contact_number)) return { success: false, error: 'Not on SMS_ALLOWED_NUMBERS' }
    // Sent as the signed-in office user: send-sms allows office staff, and its service-key check fails across key formats
    const { error } = await (await createClient()).functions.invoke('send-sms', {
      body: { phone: person.contact_number, message: `TechnoSys: ${message}`.slice(0, 459), type, recipientId: userId },
    })
    return error ? { success: false, error: error.message } : { success: true }
  } catch (e: unknown) {
    console.error('SMS failed:', e instanceof Error ? e.message : e)
    return { success: false, error: String(e) }
  }
}
