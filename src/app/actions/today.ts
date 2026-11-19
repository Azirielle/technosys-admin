// Today board (Work v2) server actions: approve or decline a review or an overtime ask, time someone out,
// name an acting lead. The database functions check the role and rules; these add the push to the person
// and the activity log. Every result is a plain sentence.
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifyRoleAccess } from '@/lib/permissions'
import { sendPushToUser } from '@/lib/push'
import { sendSmsToUser } from '@/lib/sms'
import { logActivity } from './activity'

type Res = { ok: true } | { ok: false; error: string }

const SAYS: Record<string, string> = {
  need_reason: 'Write a reason (at least a few words).',
  hr_only: 'Fake GPS time-ins are decided by HR.',
  already_decided: 'Someone already decided this one.',
  already_closed: 'They already timed out.',
  bad_time: 'The time-out must be after the time-in and not in the future.',
  not_found: 'This was removed. Refresh the page.',
  not_eligible: 'Pick a technician who is on this job.',
}
const say = (status: string) => SAYS[status] ?? "Couldn't save. Try again."

async function office() {
  const { authorized, userId } = await verifyRoleAccess('schedules')
  return authorized ? userId ?? null : null
}

export async function decideReview(reviewId: string, approve: boolean, note: string, personId: string, what: string): Promise<Res> {
  if (!(await office())) return { ok: false, error: 'Office staff only.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('decide_review', { p_review_id: reviewId, p_approve: approve, p_note: note || undefined })
  const status = (data as { status?: string } | null)?.status
  if (error || status !== 'saved') return { ok: false, error: say(status ?? '') }
  await sendPushToUser(personId, approve ? 'Approved' : 'Not approved', approve ? `${what} was approved.` : `${what} was not approved: ${note}`, { kind: 'review' })
  await logActivity('review_decided', 'attendance', `${approve ? 'Approved' : 'Declined'}: ${what}${note ? ` (${note})` : ''}`)
  revalidatePath('/coordinator/today')
  return { ok: true }
}

export async function decideOvertime(requestId: string, approve: boolean, personId: string | null, hours: number): Promise<Res> {
  if (!(await office())) return { ok: false, error: 'Office staff only.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('decide_overtime', { p_request_id: requestId, p_approve: approve })
  const status = (data as { status?: string } | null)?.status
  if (error || status !== 'saved') return { ok: false, error: say(status ?? '') }
  if (personId) await sendPushToUser(personId, approve ? 'Overtime approved' : 'Overtime not approved', `${hours} h ${approve ? 'approved' : 'not approved'} for today.`, { kind: 'overtime' })
  await logActivity('overtime_decided', 'attendance', `${approve ? 'Approved' : 'Declined'} ${hours} h overtime`)
  revalidatePath('/coordinator/today')
  return { ok: true }
}

export async function timeOutPerson(workDayId: string, timeOutIso: string, reason: string, personId: string, name: string): Promise<Res> {
  if (!(await office())) return { ok: false, error: 'Office staff only.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('coordinator_time_out', { p_work_day_id: workDayId, p_time_out: timeOutIso, p_reason: reason })
  const status = (data as { status?: string } | null)?.status
  if (error || status !== 'saved') return { ok: false, error: say(status ?? '') }
  const time = new Date(timeOutIso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })
  await sendPushToUser(personId, 'Timed out by the Coordinator', `Your time-out was set to ${time}. ${reason}`, { kind: 'time_out' })
  await logActivity('coordinator_time_out', 'attendance', `Timed out ${name} at ${time}: ${reason}`)
  revalidatePath('/coordinator/today')
  return { ok: true }
}

export async function setActingLead(jobId: string, personId: string, clientName: string): Promise<Res> {
  if (!(await office())) return { ok: false, error: 'Office staff only.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('set_acting_lead', { p_job_id: jobId, p_person_id: personId })
  const status = (data as { status?: string } | null)?.status
  if (error || status !== 'saved') return { ok: false, error: say(status ?? '') }
  await sendPushToUser(personId, 'You are the acting lead', `The lead is absent today at ${clientName}. You lead the crew.`, { kind: 'acting_lead', jobId })
  await sendSmsToUser(personId, `You are the acting lead at ${clientName} today. The lead is absent.`, 'ACTING_LEAD')
  await logActivity('acting_lead', 'jobs', `Acting lead named for ${clientName}`)
  revalidatePath('/coordinator/today')
  return { ok: true }
}
