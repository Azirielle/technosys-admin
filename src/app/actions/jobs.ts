// Jobs (Work v2) server actions for the Coordinator: save a job (after the database's save checks),
// cancel a job, and save a vehicle. Writes use the signed-in Coordinator's session, so the access rules
// apply. Everyone on a job gets a push; the result says who couldn't be reached so the Coordinator can call.
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifyRoleAccess } from '@/lib/permissions'
import { sendPushToUser } from '@/lib/push'
import { sendSmsToUser } from '@/lib/sms'
import { logActivity } from './activity'
import { clock, dateRange, type JobInput } from '@/components/jobs/jobTypes'
import type { Json } from '@/lib/supabase/database.types'

type Result = { ok: true; jobId: string; notified: number; notReached: string[] } | { ok: false; error: string }

function problemsIn(i: JobInput): string | null {
  if (!i.client_name.trim()) return 'Enter the client.'
  if (!i.address.trim()) return 'Enter the address.'
  if (!Number.isFinite(i.site_lat) || !Number.isFinite(i.site_lon)) return 'Put the pin on the map.'
  if (!i.start_date || !i.end_date) return 'Pick the dates.'
  if (i.end_date < i.start_date) return 'The last day is before the first day.'
  if (!i.start_time || !i.end_time || i.end_time <= i.start_time) return 'The end time must be after the start time.'
  if (i.report_to === 'hq' && !i.hq_office_id) return 'Pick the office they report to.'
  if (!i.lead_id) return 'Pick the lead.'
  if (i.driver_id && !i.vehicle_id) return 'Pick the vehicle for the driver.'
  if (i.report_to === 'hq' && !i.driver_id) return null // allowed; the form warns "Who drives?"
  return null
}

async function notify(people: { id: string; name: string }[], title: string, body: string, jobId: string) {
  const notReached: string[] = []
  let notified = 0
  // Where and when matter even with no mobile data; all texts go out together so Save doesn't wait for each one
  const texts = people.map((p) => sendSmsToUser(p.id, `${title}. ${body} Open the app for details.`, 'JOB'))
  for (const p of people) {
    const res = await sendPushToUser(p.id, title, body, { jobId, kind: 'job' })
    if (res.success) notified++
    else notReached.push(p.name)
  }
  await Promise.all(texts)
  return { notified, notReached }
}

export async function saveJob(input: JobInput, jobId?: string): Promise<Result> {
  const { authorized, userId } = await verifyRoleAccess('schedules', true)
  if (!authorized || !userId) return { ok: false, error: 'Only the Coordinator can schedule jobs.' }
  const problem = problemsIn(input)
  if (problem) return { ok: false, error: problem }
  if (jobId && input.change_reason.trim().length < 5) return { ok: false, error: 'Say why the job is changing (the crew sees it).' }

  const supabase = await createClient()
  const personIds = [...new Set([input.lead_id, ...input.crew_ids, ...input.helper_ids, ...(input.driver_id ? [input.driver_id] : [])])]

  // The same checks the form shows; nothing blocking may be saved
  const { data: checks, error: checkErr } = await supabase.rpc('job_save_checks', {
    p_person_ids: personIds, p_start_date: input.start_date, p_end_date: input.end_date,
    p_start_time: input.start_time, p_end_time: input.end_time,
    p_vehicle_id: input.vehicle_id ?? undefined, p_exclude_job_id: jobId ?? undefined,
  })
  if (checkErr) return { ok: false, error: "Couldn't check the crew. Try again." }
  const blocking = (checks ?? []).filter((c) => c.blocking)
  if (blocking.length) return { ok: false, error: blocking.map((c) => c.detail).join(' ') }

  const row = {
    client_name: input.client_name.trim(), address: input.address.trim(),
    project_name: input.project_name.trim() || null, notes: input.notes.trim() || null,
    site_lat: input.site_lat, site_lon: input.site_lon, site_radius_m: Math.round(input.site_radius_m),
    start_date: input.start_date, end_date: input.end_date, start_time: input.start_time, end_time: input.end_time,
    work_type: input.work_type, report_to: input.report_to, hq_office_id: input.report_to === 'hq' ? input.hq_office_id : null,
    updated_at: new Date().toISOString(),
  }

  let id = jobId
  let before: { start_date: string; end_date: string; start_time: string; end_time: string } | null = null
  if (id) {
    const { data: old } = await supabase.from('jobs').select('start_date, end_date, start_time, end_time').eq('id', id).single()
    before = old
    const { error } = await supabase.from('jobs').update(row).eq('id', id)
    if (error) return { ok: false, error: "Couldn't save the job. Try again." }
  } else {
    const { data, error } = await supabase.from('jobs').insert({ ...row, created_by: userId }).select('id').single()
    if (error || !data) return { ok: false, error: "Couldn't save the job. Try again." }
    id = data.id
  }

  // People: the wanted list vs. who is on the job now. One row per person; the driver is whoever has the vehicle.
  const crew = input.crew_ids.filter((p) => p !== input.lead_id)
  const helpers = input.helper_ids.filter((p) => p !== input.lead_id && !crew.includes(p))
  const onCrew = [input.lead_id, ...crew, ...helpers]
  const car = (p: string) => (p === input.driver_id ? input.vehicle_id : null)
  const wanted: { person_id?: string; temp_worker_id?: string; role: 'lead' | 'crew' | 'driver' | 'helper'; vehicle_id?: string | null }[] = [
    { person_id: input.lead_id, role: 'lead', vehicle_id: car(input.lead_id) },
    ...crew.map((p) => ({ person_id: p, role: 'crew' as const, vehicle_id: car(p) })),
    ...helpers.map((p) => ({ person_id: p, role: 'helper' as const, vehicle_id: car(p) })),
    // Someone who only drives gets a 'driver' row; a lead / crew / helper who drives keeps their row with the vehicle
    ...(input.driver_id && !onCrew.includes(input.driver_id) ? [{ person_id: input.driver_id, role: 'driver' as const, vehicle_id: input.vehicle_id }] : []),
    ...input.temp_worker_ids.map((t) => ({ temp_worker_id: t, role: 'crew' as const })),
  ]
  const { data: current } = await supabase.from('job_members').select('id, person_id, temp_worker_id, role, vehicle_id').eq('job_id', id).is('removed_at', null)
  const key = (m: { person_id?: string | null; temp_worker_id?: string | null }) => m.person_id ?? `t:${m.temp_worker_id}`
  const now = new Date().toISOString()
  const removed = (current ?? []).filter((c) => !wanted.some((w) => key(w) === key(c) && w.role === c.role && (w.vehicle_id ?? null) === c.vehicle_id))
  if (removed.length) await supabase.from('job_members').update({ removed_at: now }).in('id', removed.map((r) => r.id))
  const added = wanted.filter((w) => !(current ?? []).some((c) => key(w) === key(c) && w.role === c.role && (w.vehicle_id ?? null) === c.vehicle_id))
  if (added.length) {
    const { error } = await supabase.from('job_members').insert(added.map((a) => ({ job_id: id!, ...a })))
    if (error) return { ok: false, error: "The job was saved but the crew wasn't. Open it and save again." }
  }

  // History and pushes
  const moved = !!before && (before.start_date !== input.start_date || before.end_date !== input.end_date
    || before.start_time.slice(0, 5) !== input.start_time || before.end_time.slice(0, 5) !== input.end_time)
  const events = [] as { job_id: string; kind: string; by_id: string; reason: string | null; details: Json }[]
  if (!jobId) events.push({ job_id: id!, kind: 'created', by_id: userId, reason: null, details: {} })
  if (moved) events.push({ job_id: id!, kind: 'moved', by_id: userId, reason: input.change_reason.trim(), details: { before, after: { start_date: input.start_date, end_date: input.end_date, start_time: input.start_time, end_time: input.end_time } } })
  if (jobId && (removed.length || added.length)) events.push({ job_id: id!, kind: 'crew_changed', by_id: userId, reason: input.change_reason.trim(), details: { added: added.length, removed: removed.length } })
  if (events.length) await supabase.from('job_events').insert(events)

  const { data: names } = await supabase.from('profiles').select('id, full_name').in('id', personIds)
  const nameOf = (pid: string) => names?.find((n) => n.id === pid)?.full_name ?? 'Someone'
  const when = `${dateRange(input.start_date, input.end_date)}, ${clock(input.start_time)}`
  const where = input.report_to === 'hq' ? 'Report to the office first.' : 'Go straight to the site.'
  const newPeople = added.filter((a) => a.person_id).map((a) => ({ id: a.person_id!, name: nameOf(a.person_id!) }))
  const stayed = personIds.filter((p) => !newPeople.some((n) => n.id === p)).map((p) => ({ id: p, name: nameOf(p) }))
  const a = await notify(newPeople, `New job: ${row.client_name}`, `${when}. ${where}`, id!)
  const b = moved ? await notify(stayed, `Job moved: ${row.client_name}`, `Now ${when}. ${input.change_reason.trim()}`, id!) : { notified: 0, notReached: [] as string[] }
  const goneIds = removed.map((r) => r.person_id).filter(Boolean) as string[]
  if (goneIds.length) await notify(goneIds.map((p) => ({ id: p, name: '' })), `Removed from: ${row.client_name}`, input.change_reason.trim() || 'The Coordinator changed the crew.', id!)

  await logActivity('job_saved', 'jobs', `${jobId ? 'Updated' : 'Created'} job "${row.client_name}" (${when})`)
  revalidatePath('/coordinator/jobs')
  return { ok: true, jobId: id!, notified: a.notified + b.notified, notReached: [...a.notReached, ...b.notReached] }
}

export async function cancelJob(jobId: string, reason: string): Promise<{ ok: boolean; error?: string; notReached?: string[] }> {
  const { authorized, userId } = await verifyRoleAccess('schedules', true)
  if (!authorized || !userId) return { ok: false, error: 'Only the Coordinator can cancel jobs.' }
  if (reason.trim().length < 5) return { ok: false, error: 'Say why the job is cancelled (the crew sees it).' }
  const supabase = await createClient()
  const { data: job, error } = await supabase.from('jobs').update({ status: 'cancelled', cancel_reason: reason.trim(), updated_at: new Date().toISOString() })
    .eq('id', jobId).select('client_name').single()
  if (error || !job) return { ok: false, error: "Couldn't cancel the job. Try again." }
  await supabase.from('job_events').insert({ job_id: jobId, kind: 'cancelled', by_id: userId, reason: reason.trim() })
  const { data: members } = await supabase.from('job_members').select('person_id, person:profiles!job_members_person_id_fkey ( full_name )')
    .eq('job_id', jobId).is('removed_at', null).not('person_id', 'is', null)
  const res = await notify((members ?? []).map((m) => ({ id: m.person_id!, name: (m.person as { full_name?: string } | null)?.full_name ?? '' })),
    `Cancelled: ${job.client_name}`, reason.trim(), jobId)
  await logActivity('job_cancelled', 'jobs', `Cancelled job "${job.client_name}": ${reason.trim()}`)
  revalidatePath('/coordinator/jobs')
  return { ok: true, notReached: res.notReached }
}

export async function saveVehicle(v: { name: string; plate: string; home_office_id: string; status: 'active' | 'in_repair' | 'retired' }, id?: string) {
  const { authorized } = await verifyRoleAccess('schedules', true)
  if (!authorized) return { ok: false, error: 'Only the Coordinator can manage vehicles.' }
  if (!v.name.trim() || !v.plate.trim() || !v.home_office_id) return { ok: false, error: 'Enter the name, plate and home office.' }
  const supabase = await createClient()
  const row = { name: v.name.trim(), plate: v.plate.trim().toUpperCase(), home_office_id: v.home_office_id, status: v.status, updated_at: new Date().toISOString() }
  const { error } = id ? await supabase.from('vehicles').update(row).eq('id', id) : await supabase.from('vehicles').insert(row)
  if (error) return { ok: false, error: error.code === '23505' ? 'That plate is already in the list.' : "Couldn't save the vehicle." }
  await logActivity('vehicle_saved', 'vehicles', `${id ? 'Updated' : 'Added'} vehicle ${row.name} (${row.plate})`)
  revalidatePath('/coordinator/jobs')
  return { ok: true }
}
