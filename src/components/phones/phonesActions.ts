// Reads for the HR "Work phones" page: every technician and helper with their registered phone and any
// request to switch to a new phone. Approving, declining and resetting reuse files/signInActions.ts.
// Only HR and the CEO can read phone details (access rule "own phone or hr", migration 20261116131430).
import { createClient } from '@/lib/supabase/client'

type Client = ReturnType<typeof createClient>

export type WorkPhoneRow = {
  id: string
  full_name: string
  technician_level: string | null
  contact_number: string | null
  phone: { device_name: string | null; registered_at: string; last_seen_at: string } | null
  request: { id: string; device_name: string | null; requested_at: string } | null
}

/** Status shown in the table and used by the tabs. */
export type PhoneState = 'waiting' | 'registered' | 'none'

export function phoneState(row: WorkPhoneRow): PhoneState {
  if (row.request) return 'waiting'
  return row.phone ? 'registered' : 'none'
}

export async function loadWorkPhones(supabase: Client): Promise<WorkPhoneRow[]> {
  const [people, phones, requests] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, technician_level, contact_number')
      .in('role', ['technician', 'helper'])
      .in('lifecycle_status', ['active', 'on_leave'])
      .order('full_name'),
    supabase.from('registered_devices').select('profile_id, device_name, registered_at, last_seen_at'),
    supabase.from('device_change_requests').select('id, profile_id, device_name, requested_at').eq('status', 'pending'),
  ])
  const failed = people.error || phones.error || requests.error
  if (failed) throw failed

  return (people.data ?? []).map((p) => {
    const phone = (phones.data ?? []).find((d) => d.profile_id === p.id)
    const request = (requests.data ?? []).find((r) => r.profile_id === p.id)
    return {
      ...p,
      phone: phone ? { device_name: phone.device_name, registered_at: phone.registered_at, last_seen_at: phone.last_seen_at } : null,
      request: request ? { id: request.id, device_name: request.device_name, requested_at: request.requested_at } : null,
    }
  })
}
