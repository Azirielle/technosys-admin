// Announcement shape for the page, plus plain labels for audiences, priorities and statuses.
import type { AnnouncementAudience, AnnouncementPriority, AnnouncementRow, AnnouncementStatus } from '@/app/actions/announcements'
import type { Tone } from '@/components/ui'

export type { AnnouncementAudience, AnnouncementPriority, AnnouncementStatus }

export const AUDIENCES: { value: AnnouncementAudience; label: string; hint: string }[] = [
  { value: 'all', label: 'Everyone', hint: 'Office and field staff' },
  { value: 'field_staff', label: 'Field staff', hint: 'Technicians and helpers, in the mobile app' },
  { value: 'office_staff', label: 'Office staff', hint: 'CEO, HR and Service Dept' },
]

export const PRIORITIES: { value: AnnouncementPriority; label: string; tone: Tone }[] = [
  { value: 'normal', label: 'Normal', tone: 'neutral' },
  { value: 'important', label: 'Important', tone: 'warning' },
  { value: 'urgent', label: 'Urgent', tone: 'danger' },
]

export const STATUS: Record<AnnouncementStatus, { label: string; tone: Tone }> = {
  published: { label: 'Published', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  draft: { label: 'Draft', tone: 'neutral' },
}

const ROLE: Record<string, string> = { ceo: 'CEO', hr: 'HR', coordinator: 'Service Dept' }

export function roleLabel(role: string | undefined) {
  return (role && ROLE[role]) || 'Office'
}

export function audienceLabel(a: string) {
  return AUDIENCES.find((x) => x.value === a)?.label ?? 'Everyone'
}

export function priorityOf(p: string) {
  return PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[0]
}

export type Announcement = AnnouncementRow

/** "2026-11-14T08:00" for a datetime-local input, in the browser's time. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
