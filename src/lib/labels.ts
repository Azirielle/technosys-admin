// Plain-language labels for database values (leave types, job status) and the badge tone for each.
import type { Tone } from '@/components/ui'

export const LEAVE_LABELS: Record<string, string> = {
  sick: 'Sick leave',
  vacation: 'Vacation leave',
  emergency: 'Emergency leave',
  wedding: 'Wedding leave',
  maternal: 'Maternity leave',
  paternal: 'Paternity leave',
  unpaid: 'Unpaid leave',
}

export const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  scheduled: { label: 'Scheduled', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'warning' },
  ongoing: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Done', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
}

export const REQUEST_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}
