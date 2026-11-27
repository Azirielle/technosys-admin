'use server'

import { verifyRoleAccess } from '@/lib/permissions'
import { sendPushToUser } from '@/lib/push'
import { sendSmsToUser } from '@/lib/sms'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { LEAVE_LABELS } from '@/lib/labels'
import { daysOut, isOverdue, type Borrowing } from '@/components/inventory/types'

/** Office staff send a push notification to one employee's phone (e.g. "please submit your 201 requirements"). */
export async function notifyEmployee(userId: string, title: string, body: string, type: string) {
  const { authorized } = await verifyRoleAccess('employees')
  if (!authorized) return { success: false, error: 'Not allowed' }
  return sendPushToUser(userId, title, body, { type })
}

const day = (d: string) => new Date(`${d}T00:00:00+08:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })

// The three below read the decision from the saved row, not from the browser, so they can't be used to text anything else.

/** After HR decides a leave: push + SMS to the person who filed it. */
export async function notifyLeaveDecision(leaveId: string) {
  const { authorized } = await verifyRoleAccess('leaves', true)
  if (!authorized) return
  const { data: l } = await supabaseAdmin.from('leaves')
    .select('technician_id, status, leave_type, start_date, end_date, rejection_reason').eq('id', leaveId).single()
  if (!l?.technician_id || l.status === 'pending') return
  const days = l.start_date === l.end_date ? day(l.start_date) : `${day(l.start_date)} to ${day(l.end_date)}`
  const what = `Your ${(LEAVE_LABELS[l.leave_type] ?? 'leave').toLowerCase()} on ${days}`
  const ok = l.status === 'approved'
  const text = ok ? `${what} was approved.` : `${what} was not approved${l.rejection_reason ? `: ${l.rejection_reason}` : '.'}`
  await sendPushToUser(l.technician_id, ok ? 'Leave approved' : 'Leave not approved', text, { type: 'leave' })
  await sendSmsToUser(l.technician_id, text, 'LEAVE')
}

/** After HR approves or declines a new phone. SMS only: the new phone isn't signed in, so a push can't reach it. */
export async function notifyPhoneDecision(requestId: string) {
  const { authorized } = await verifyRoleAccess('employees', true)
  if (!authorized) return
  const { data: r } = await supabaseAdmin.from('device_change_requests').select('profile_id, status').eq('id', requestId).single()
  if (!r || r.status === 'pending') return
  await sendSmsToUser(r.profile_id, r.status === 'approved'
    ? 'HR approved your new phone. You can sign in on it now.'
    : "HR didn't approve the new phone. Keep using your registered phone, or call HR.", 'PHONE')
}

/** After HR sets a sign-in PIN. Never contains the PIN: HR tells it in person. */
export async function notifyPinChanged(profileId: string) {
  const { authorized } = await verifyRoleAccess('employees', true)
  if (!authorized) return
  await sendSmsToUser(profileId, "HR set a new sign-in PIN for you. Ask HR for it. Didn't expect this? Call HR.", 'PIN')
}

/** Coordinator, 28 Nov: an overdue tool. Push + SMS to the person who has it, asking them to bring it back now.
 *  Built from the saved borrowing, so it only goes out for a tool still out past the overdue limit. */
export async function remindToolReturn(borrowingId: string): Promise<{ sent: boolean; error?: string }> {
  const { authorized } = await verifyRoleAccess('inventory', true)
  if (!authorized) return { sent: false, error: 'Not allowed' }
  const { data: b } = await supabaseAdmin.from('tool_borrowings')
    .select('technician_id, status, handed_over_at, quantity, tool:tools ( name )').eq('id', borrowingId).single()
  if (!b?.technician_id || !b.handed_over_at || b.status !== 'checked_out') return { sent: false, error: 'This tool is no longer out.' }
  // Same overdue rule as the Inventory table (Manila days)
  const row = { status: b.status, handed_over_at: b.handed_over_at, returned_at: null } as Borrowing
  if (!isOverdue(row)) return { sent: false, error: 'This tool is not overdue yet.' }
  const days = daysOut(row)
  const tool = (Array.isArray(b.tool) ? b.tool[0] : b.tool)?.name ?? 'tool'
  const what = `${b.quantity > 1 ? `${b.quantity} × ` : ''}${tool}`
  const text = `Please bring back the ${what} you borrowed on ${new Date(b.handed_over_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })} today. It is ${days} days out (overdue).`
  const [push, sms] = await Promise.all([
    sendPushToUser(b.technician_id, 'Return the tool today', text, { type: 'tool_overdue' }),
    sendSmsToUser(b.technician_id, text, 'TOOL'),
  ])
  return push.success || sms.success ? { sent: true } : { sent: false, error: "Couldn't reach their phone (no app sign-in or mobile number)." }
}
