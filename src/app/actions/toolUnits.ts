'use server'
// Tool units (one ID per physical tool, migration 20261126011929_tool_units): lend specific units, and decide on a
// unit checked in damaged. The database functions check the caller is the Coordinator or CEO and do it all at once.
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from './activity'

const PROBLEM: Record<string, string> = {
  none_picked: 'Pick at least one tool ID.',
  bad_person: 'That person can’t borrow tools (not an active technician or helper).',
  not_found: 'One of the tools is gone. Close this window and try again.',
  mixed_tools: 'Lend one kind of tool at a time.',
}

export async function lendUnits(personId: string, unitIds: string[], notes: string, delivery: 'pickup' | 'driver'): Promise<{ error?: string; tags?: string[] }> {
  if (!personId) return { error: 'Choose who is borrowing it.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lend_tool_units', { p_technician_id: personId, p_unit_ids: unitIds, p_notes: notes, p_delivery: delivery })
  if (error) return { error: error.message.includes('Only the Coordinator') ? 'Only the Coordinator can lend tools.' : "Couldn't lend it. Try again." }
  const r = data as { status: string; tag?: string; tags?: string[]; name?: string }
  if (r.status === 'taken') return { error: `${r.tag} was just lent to someone else. Pick another one.` }
  if (r.status !== 'lent') return { error: PROBLEM[r.status] ?? "Couldn't lend it. Try again." }
  await logActivity({ category: 'inventory', action: 'checkout', description: `Lent ${r.tags?.join(', ')} to ${r.name ?? 'a technician'} (${delivery === 'driver' ? 'driver delivers' : 'picks up at the office'})` })
  revalidatePath('/coordinator/inventory')
  return { tags: r.tags }
}

/** A unit checked in damaged: back in service, or written off. */
export async function decideUnit(unitId: string, backInService: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('decide_tool_unit', { p_unit_id: unitId, p_back_in_service: backInService })
  if (error) return { error: "Couldn't save. Try again." }
  const r = data as { status: string; tag?: string }
  if (r.status !== 'done') return { error: 'This tool was already decided. Refresh the page.' }
  await logActivity({ category: 'inventory', action: backInService ? 'restored' : 'written_off', description: `${r.tag}: ${backInService ? 'back in service' : 'written off'} after a damage check` })
  revalidatePath('/coordinator/inventory')
  return {}
}
