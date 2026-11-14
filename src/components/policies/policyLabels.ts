// Plain labels for policy categories, audiences and statuses, and what HR should do next with a policy.
import type { CompanyPolicy, PolicyCategory } from '@/app/actions/policies'
import type { Tone } from '@/components/ui'

export const CATEGORIES: { value: PolicyCategory; label: string }[] = [
  { value: 'hr_attendance', label: 'HR and attendance' },
  { value: 'field_ops', label: 'Field work and safety' },
  { value: 'inventory', label: 'Tools and equipment' },
  { value: 'conduct', label: 'Code of conduct' },
  { value: 'legal', label: 'Legal and privacy' },
  { value: 'executive', label: 'Management' },
]

/** Older category names in the database, shown under their current name. */
const OLD_CATEGORY: Record<string, PolicyCategory> = { employment: 'hr_attendance', attendance: 'hr_attendance', safety: 'field_ops' }

export function categoryLabel(c: string) {
  const key = OLD_CATEGORY[c] ?? c
  return CATEGORIES.find((x) => x.value === key)?.label ?? c
}

export const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'technician', label: 'Technicians and helpers' },
  { value: 'admin', label: 'Office staff' },
] as const

export type Audience = (typeof AUDIENCES)[number]['value']

export function audienceLabel(a: string) {
  return AUDIENCES.find((x) => x.value === a)?.label ?? a
}

export const STATUS: Record<CompanyPolicy['status'], { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  under_review: { label: 'Waiting for approval', tone: 'warning' },
  active: { label: 'Published', tone: 'success' },
  archived: { label: 'Archived', tone: 'neutral' },
}

/** Today in Manila as "2026-11-14". */
export function todayYmd() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
}

/** "2026-11-21": a date N days from today. */
export function daysFromToday(n: number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(Date.now() + n * 86400000))
}

/** Field work, safety and tools policies are checked by the Coordinator before HR publishes them. */
export function needsCoordinatorReview(p: CompanyPolicy) {
  return ['safety', 'field_ops', 'inventory'].includes(p.category)
}

/** Short instruction for the "Next step" column. */
export function nextStep(p: CompanyPolicy, unsigned: number) {
  if (p.status === 'draft') return 'Finish and send for approval'
  if (p.status === 'under_review') return 'Approve or ask for changes'
  if (p.status === 'active' && p.is_mandatory && unsigned > 0) return `${unsigned} still to sign`
  if (p.status === 'active') return 'Nothing to do'
  return '—'
}
