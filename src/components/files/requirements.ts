// The 201 file checklist, the employee shape used on the 201 Files page, and plain labels for its values.
import type { Tone } from '@/components/ui'

export type DocKey = 'has_sss_id' | 'has_philhealth_id' | 'has_pagibig_id' | 'has_medical_clearance' | 'has_nbi_clearance' | 'has_resume'

export interface Requirement {
  key: DocKey
  label: string
  /** Short name for tables: "SSS", "NBI". */
  short: string
  hint: string
}

/** Every 201 file needs all of these (columns on `profiles`). */
export const REQUIREMENTS: Requirement[] = [
  { key: 'has_sss_id', label: 'SSS ID or number', short: 'SSS', hint: 'Social Security System' },
  { key: 'has_philhealth_id', label: 'PhilHealth ID', short: 'PhilHealth', hint: 'National health insurance' },
  { key: 'has_pagibig_id', label: 'Pag-IBIG number', short: 'Pag-IBIG', hint: 'Home Development Mutual Fund' },
  { key: 'has_medical_clearance', label: 'Medical certificate (fit to work)', short: 'Medical', hint: 'Needed for aircon installation work' },
  { key: 'has_nbi_clearance', label: 'NBI or police clearance', short: 'NBI', hint: 'Needed to enter client sites' },
  { key: 'has_resume', label: 'Resume or bio-data', short: 'Resume', hint: 'Work history and training' },
]

export interface Warning {
  id: string
  subject: string
  details: string
  warning_level: string
  incident_date: string | null
  created_at: string
  status: string
}

export type EmployeeFile = {
  id: string
  full_name: string
  role: string
  employment_status: string | null
  lifecycle_status: string
  technician_level: string | null
  hire_date: string | null
  contact_number: string | null
  warnings: Warning[]
} & Partial<Record<DocKey, boolean | null>>

export function fileStatus(emp: EmployeeFile) {
  const missing = REQUIREMENTS.filter((r) => !emp[r.key])
  return { done: REQUIREMENTS.length - missing.length, total: REQUIREMENTS.length, missing, complete: missing.length === 0 }
}

/** Values allowed by the database (profiles_employment_status_check). */
export const EMPLOYMENT_STATUS = [
  { value: 'regular', label: 'Regular' },
  { value: 'provisionary', label: 'Probationary' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'ojt', label: 'OJT' },
]

/** Values allowed by the database (profiles_technician_level_check). */
export const LEVELS = [
  { value: 'senior', label: 'Senior technician' },
  { value: 'technician', label: 'Technician' },
  { value: 'helper', label: 'Helper' },
]

export function labelOf(list: { value: string; label: string }[], value: string | null | undefined) {
  return list.find((o) => o.value === value)?.label ?? value ?? '—'
}

/** Labor Code twin-notice steps, lightest first. */
export const WARNING_LEVELS: { value: string; label: string; tone: Tone }[] = [
  { value: 'Verbal Reprimand', label: 'Verbal reprimand', tone: 'neutral' },
  { value: 'Standard Warning', label: 'Written warning', tone: 'warning' },
  { value: 'Final Warning', label: 'Notice to explain / final warning', tone: 'danger' },
]
