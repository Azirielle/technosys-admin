// Jobs (Work v2): the shapes the Coordinator's Jobs page works with, and plain labels for their values.
// Tables: jobs, job_members, vehicles, job_events (see DATABASE_GUIDE.md, "Work v2").
import type { Tone } from '@/components/ui'

export type WorkType = 'on_site' | 'out_of_town' | 'office'
export type ReportTo = 'site' | 'hq'
export type JobStatus = 'planned' | 'ongoing' | 'done' | 'cancelled'
export type MemberRole = 'lead' | 'crew' | 'driver' | 'helper'

export type JobMember = {
  id: string
  role: MemberRole
  person_id: string | null
  temp_worker_id: string | null
  vehicle_id: string | null
  is_acting_lead: boolean
  name: string
  /** When their phone first showed them this job (null = not yet) */
  seen_at: string | null
}

export type Job = {
  id: string
  client_name: string
  address: string
  /** Old jobs only: the form now asks for the scope instead */
  project_name: string | null
  scope: Scope | null
  priority: Priority
  notes: string | null
  site_lat: number
  site_lon: number
  site_radius_m: number
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  work_type: WorkType
  report_to: ReportTo
  hq_office_id: string | null
  status: JobStatus
  cancel_reason: string | null
  /** VIP squeeze-in: may take people already booked at the same time */
  is_vip: boolean
  /** Set when a VIP job took someone from this job; cleared when the Coordinator saves this job */
  vip_note: string | null
  members: JobMember[]
}

export type Vehicle = { id: string; name: string; plate: string; home_office_id: string; status: 'active' | 'in_repair' | 'retired' }
export type Office = { id: string; name: string; latitude: number; longitude: number; radius_meters: number }
export type Person = { id: string; full_name: string; role: 'technician' | 'helper'; technician_level: string | null; contact_number?: string | null; avatar_url?: string | null }
export type TempWorker = { id: string; full_name: string; contact_number: string | null }

export type SaveCheck = { person_id: string | null; vehicle_id: string | null; kind: string; blocking: boolean; detail: string }

/** Does this check stop saving? On a VIP job, "already on another job" doesn't: saving takes them from that job. */
export const blocks = (c: SaveCheck, vip: boolean) => c.blocking && !(vip && c.kind === 'other_job')

/** What the job form sends to the server. Times are "HH:MM", dates "YYYY-MM-DD". */
export type JobInput = {
  client_name: string
  address: string
  scope: Scope | ''
  priority: Priority
  notes: string
  site_lat: number
  site_lon: number
  site_radius_m: number
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  work_type: WorkType
  report_to: ReportTo
  hq_office_id: string | null
  lead_id: string
  crew_ids: string[]
  helper_ids: string[]
  driver_id: string | null
  vehicle_id: string | null
  temp_worker_ids: string[]
  is_vip: boolean
  /** Required when changing a job that's already saved */
  change_reason: string
}

/** Scope of work: what the crew does there (client's list, Nov 2026). Replaces the old free-text "Project". */
export type Scope = 'repair' | 'cleaning' | 'installation' | 'troubleshooting' | 'inspection'
export const SCOPES: { value: Scope; label: string }[] = [
  { value: 'repair', label: 'Repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'installation', label: 'Installation' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'inspection', label: 'Inspection' },
]
export const scopeLabel = (s: Scope | null) => SCOPES.find((x) => x.value === s)?.label ?? null

/** Priority level (prof, 20 Nov). A VIP squeeze-in is Urgent on top of this (components/jobs/PriorityBadge). */
export type Priority = 'low' | 'medium' | 'high'
export const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'warning' },
}
export const PRIORITIES = (Object.keys(PRIORITY) as Priority[]).map((value) => ({ value, label: PRIORITY[value].label }))

export const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'on_site', label: 'On site (day job)' },
  { value: 'out_of_town', label: 'Out of town' },
  { value: 'office', label: 'Office / shop work' },
]

export const REPORT_TO: { value: ReportTo; label: string; hint: string }[] = [
  { value: 'site', label: 'Go straight to the site', hint: 'They time in inside the site circle.' },
  { value: 'hq', label: 'Report to the office first', hint: 'They time in at the office and ride together.' },
]

export const STATUS: Record<JobStatus, { label: string; tone: Tone }> = {
  planned: { label: 'Planned', tone: 'neutral' },
  ongoing: { label: 'In progress', tone: 'info' },
  done: { label: 'Done', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const ROLE_LABEL: Record<MemberRole, string> = { lead: 'Lead', crew: 'Crew', driver: 'Driver', helper: 'Helper' }

/** "8:00 AM" from "08:00" or "08:00:00" */
export function clock(t: string) {
  const [h, m] = t.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

/** "Nov 20" or "Nov 20–22" */
export function dateRange(start: string, end: string) {
  const f = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  return start === end ? f(start) : `${f(start)}–${f(end)}`
}

/** Today in Manila as YYYY-MM-DD */
export const manilaToday = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
