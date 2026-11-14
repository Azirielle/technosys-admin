// Plain labels for jobs: type, status, and short date/time text used across the scheduling views.
import type { LucideIcon } from 'lucide-react'
import { Building2, PlaneTakeoff, Wrench } from 'lucide-react'
import type { Tone } from '@/components/ui'
import type { ScheduleItem } from './types'

export const JOB_TYPE: Record<string, { label: string; icon: LucideIcon }> = {
  on_site: { label: 'On-site', icon: Wrench },
  deployment: { label: 'Out of town', icon: PlaneTakeoff },
  office_duty: { label: 'Office duty', icon: Building2 },
}

export function jobType(s: ScheduleItem) {
  return JOB_TYPE[s.assignment_type || 'on_site'] ?? JOB_TYPE.on_site
}

export function hasNoLead(s: ScheduleItem) {
  return !s.technician_id || s.status === 'unassigned'
}

export function jobStatus(s: ScheduleItem): { label: string; tone: Tone } {
  if (s.status === 'cancelled') return { label: 'Cancelled', tone: 'neutral' }
  if (hasNoLead(s)) return { label: 'No lead yet', tone: 'danger' }
  if (s.status === 'in_progress') return { label: 'In progress', tone: 'warning' }
  if (s.status === 'completed') return { label: 'Done', tone: 'success' }
  return { label: 'Scheduled', tone: 'info' }
}

export function timeOf(iso?: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

export function dayOf(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })
}
