'use server'
// HR adds, archives and restores technician / helper accounts (201 Files). Archiving is the "delete": the person
// can't sign in any more (status archived + auth ban), but their DTR, jobs and records stay.
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { normalizePhMobile } from '@/lib/phone'
import { logAdminActivity } from '@/lib/auditLogger'

type Result = { error?: string; id?: string }
export type NewAccount = {
  full_name: string
  username: string
  technician_level: string
  employment_status: string
  contact_number: string
  hire_date: string
}

const LEVELS = ['senior', 'technician', 'helper']
const STATUSES = ['regular', 'provisionary', 'contractual', 'ojt']

/** The signed-in person's id if they are HR or the CEO. */
async function hrOnly(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role, lifecycle_status').eq('id', user.id).single()
  return data && ['hr', 'ceo'].includes(data.role) && data.lifecycle_status === 'active' ? user.id : null
}

function log(action: string, target: string) {
  return logAdminActivity({ adminName: '', adminRole: '', adminRoleKey: 'hr', moduleKey: 'hr_files', moduleName: '201 Files', action, targetEntity: target })
}

export async function createAccount(input: NewAccount): Promise<Result> {
  if (!(await hrOnly())) return { error: 'Only HR can do this.' }
  const name = input.full_name.trim().replace(/\s+/g, ' ')
  const username = input.username.trim().toLowerCase()
  const phone = normalizePhMobile(input.contact_number)
  if (name.length < 3) return { error: 'Enter their full name.' }
  if (!/^[a-z0-9]{3,20}$/.test(username)) return { error: 'Username: 3 to 20 small letters or numbers, no spaces.' }
  if (!phone) return { error: 'Enter an 11-digit mobile number, like 09171234567.' }
  if (!LEVELS.includes(input.technician_level) || !STATUSES.includes(input.employment_status)) return { error: 'Pick a level and an employment status.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.hire_date)) return { error: 'Pick the hire date.' }

  const { data: taken } = await supabaseAdmin.from('profiles').select('full_name').eq('contact_number', phone).maybeSingle()
  if (taken) return { error: `${phone} is already ${taken.full_name}'s number.` }

  const email = `${username}@technocycle.ph`
  // They sign in on the phone with their number + the PIN HR sets; this password is never used or shown.
  const { data: made, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
    email_confirm: true,
  })
  if (authErr || !made.user) {
    return { error: /already|registered|exists/i.test(authErr?.message ?? '') ? `The username "${username}" is already taken.` : "Couldn't make the account. Try again." }
  }

  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id: made.user.id,
    full_name: name,
    role: input.technician_level === 'helper' ? 'helper' : 'technician',
    technician_level: input.technician_level,
    employment_status: input.employment_status,
    contact_number: phone,
    hire_date: `${input.hire_date}T00:00:00+08:00`,
    lifecycle_status: 'active',
  })
  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(made.user.id) // no half-made accounts
    return { error: "Couldn't save their profile, so nothing was made. Try again." }
  }
  await log('Made a new account', `${name} (${username})`)
  return { id: made.user.id }
}

/** Field staff only: never HR, CEO or Coordinator accounts. */
async function fieldPerson(id: string) {
  const { data } = await supabaseAdmin.from('profiles').select('full_name, role, lifecycle_status').eq('id', id).single()
  return data && ['technician', 'helper'].includes(data.role) ? data : null
}

export async function archiveAccount(id: string): Promise<Result> {
  if (!(await hrOnly())) return { error: 'Only HR can do this.' }
  const person = await fieldPerson(id)
  if (!person) return { error: 'Only technician and helper accounts can be archived here.' }

  const [{ count: tools }, { data: jobs }] = await Promise.all([
    supabaseAdmin.from('tool_borrowings').select('id', { count: 'exact', head: true }).eq('technician_id', id).eq('status', 'checked_out'),
    supabaseAdmin.from('job_members').select('job:jobs!inner ( status )').eq('person_id', id).is('removed_at', null).in('job.status', ['planned', 'ongoing']),
  ])
  const openJobs = jobs?.length ?? 0
  if (tools || openJobs) {
    const left = [tools ? `${tools} tool${tools === 1 ? '' : 's'} to return` : null, openJobs ? `${openJobs} job${openJobs === 1 ? '' : 's'} not finished (take them off in Scheduling)` : null]
    return { error: `${person.full_name} still has ${left.filter(Boolean).join(' and ')}. Sort that out first.` }
  }

  const { error } = await supabaseAdmin.from('profiles').update({ lifecycle_status: 'archived' }).eq('id', id)
  if (error) return { error: "Couldn't archive. Try again." }
  // ~100 years: also signs out a phone that is already signed in (its next token refresh fails)
  const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' })
  if (banErr) {
    await supabaseAdmin.from('profiles').update({ lifecycle_status: person.lifecycle_status }).eq('id', id)
    return { error: "Couldn't block their sign-in, so nothing changed. Try again." }
  }
  await log('Archived an account', person.full_name)
  return {}
}

export async function restoreAccount(id: string): Promise<Result> {
  if (!(await hrOnly())) return { error: 'Only HR can do this.' }
  const person = await fieldPerson(id)
  if (!person) return { error: 'Only technician and helper accounts can be restored here.' }
  const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' })
  if (banErr) return { error: "Couldn't restore. Try again." }
  const { error } = await supabaseAdmin.from('profiles').update({ lifecycle_status: 'active' }).eq('id', id)
  if (error) return { error: "Couldn't restore. Try again." }
  await log('Restored an account', person.full_name)
  return {}
}
