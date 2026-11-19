'use server'

import { verifyRoleAccess } from '@/lib/permissions'
import { sendPushToUser } from '@/lib/push'
import { sendSmsToUser } from '@/lib/sms'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { LEAVE_LABELS } from '@/lib/labels'

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
