// Reads and writes for the 201 Files page: load staff with warnings, tick documents, warnings, details, reminders.
import { createClient } from '@/lib/supabase/client'
import { logAdminActivity } from '@/lib/auditLogger'
import { normalizePhMobile } from '@/lib/phone'
import { notifyEmployee } from '@/app/actions/notifications'
import { REQUIREMENTS, fileStatus, type DocKey, type EmployeeFile, type Warning } from './requirements'

type Client = ReturnType<typeof createClient>

function log(action: string, target: string) {
  // The server records who is signed in; these names only build the description.
  logAdminActivity({ adminName: '', adminRole: '', adminRoleKey: 'hr', moduleKey: 'hr_files', moduleName: '201 Files', action, targetEntity: target })
}

/** Technicians and helpers, each with their warnings (newest first). */
export async function loadEmployeeFiles(supabase: Client): Promise<EmployeeFile[]> {
  const [{ data: people, error }, { data: warnings }] = await Promise.all([
    supabase.from('profiles').select('*').in('role', ['technician', 'helper']).order('full_name'),
    supabase.from('employee_warnings').select('*').order('created_at', { ascending: false }),
  ])
  if (error) throw error
  return (people ?? []).map((p) => ({
    ...(p as unknown as EmployeeFile),
    warnings: ((warnings ?? []) as Warning[]).filter((w) => (w as Warning & { employee_id: string }).employee_id === p.id),
  }))
}

/** Marks one 201 requirement as received (true) or not yet (false). */
export async function setDocumentReceived(supabase: Client, emp: EmployeeFile, key: DocKey, received: boolean) {
  const change: Partial<Record<DocKey, boolean>> = { [key]: received }
  const { error } = await supabase.from('profiles').update(change).eq('id', emp.id)
  if (error) throw error
  const label = REQUIREMENTS.find((r) => r.key === key)?.label ?? key
  log(received ? 'Marked 201 document received' : 'Unmarked 201 document', `${label} (${emp.full_name})`)
}

/** Push notification to the employee listing what's still missing. */
export async function requestMissingDocuments(emp: EmployeeFile) {
  const { missing } = fileStatus(emp)
  await notifyEmployee(
    emp.id,
    'HR needs documents for your 201 file',
    `Please bring or send: ${missing.map((m) => m.label).join(', ')}.`,
    '201_compliance_reminder',
  )
  log('Asked for 201 documents', `${emp.full_name} (${missing.length} missing)`)
}

export async function addWarning(supabase: Client, emp: EmployeeFile, level: string, subject: string, details: string, incidentDate: string) {
  const { data } = await supabase.auth.getUser()
  const { error } = await supabase.from('employee_warnings').insert({
    employee_id: emp.id,
    issued_by: data.user?.id as string,
    subject: subject.trim(),
    details: details.trim(),
    warning_level: level,
    status: 'pending_service_review',
    incident_date: incidentDate,
  })
  if (error) throw error
  log('Recorded a warning', `${subject.trim()} (${emp.full_name})`)
}

/** Returns an error sentence, or null when saved. */
export async function saveEmployeeDetails(
  supabase: Client,
  emp: EmployeeFile,
  form: { employment_status: string; technician_level: string; contact_number: string },
): Promise<string | null> {
  const phone = normalizePhMobile(form.contact_number)
  if (form.contact_number.trim() && !phone) return 'Enter an 11-digit mobile number, like 09171234567.'
  const { error } = await supabase
    .from('profiles')
    .update({ employment_status: form.employment_status, technician_level: form.technician_level, contact_number: phone })
    .eq('id', emp.id)
  if (error) return error.message
  log('Updated employee details', emp.full_name)
  return null
}

/** One row per person: what's complete, what's missing, how many warnings. */
export function exportFilesCsv(employees: EmployeeFile[]) {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const rows = [
    ['Employee', 'Role', 'Level', 'Employment status', '201 file', 'Documents', 'Missing', 'Warnings'],
    ...employees.map((e) => {
      const s = fileStatus(e)
      return [e.full_name, e.role, e.technician_level ?? '', e.employment_status ?? '', s.complete ? 'Complete' : 'Incomplete', `${s.done}/${s.total}`, s.missing.map((m) => m.short).join(', '), e.warnings.length]
    }),
  ]
  const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `technocycle_201_files_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
