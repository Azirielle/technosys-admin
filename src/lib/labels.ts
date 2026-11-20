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

// Same colours everywhere: grey planned, blue in progress, green done, amber waiting on someone, red declined / late
export const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  planned: { label: 'Planned', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'info' },
  ongoing: { label: 'In progress', tone: 'info' },
  done: { label: 'Done', tone: 'success' },
  completed: { label: 'Done', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const REQUEST_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Declined', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}
