// Scheduling board colours as Tailwind classes (tokens only): job blocks by status, and the small status pills.
import type { JobStatus } from '@/components/jobs/jobTypes'
import type { Tone } from './scheduleMath'

/** Grey planned · blue in progress · green done */
export const JOB_TONE: Record<JobStatus, string> = {
  planned: 'bg-surface-soft ring-1 ring-inset ring-line-strong hover:bg-surface-hover',
  ongoing: 'bg-info-soft ring-1 ring-inset ring-info/35',
  done: 'bg-success-soft',
  cancelled: 'bg-surface-soft opacity-60',
}

export const STATUS_PILL: Record<Tone, string> = {
  neutral: 'bg-surface-soft text-ink-2',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

/** The dot beside an agenda line */
export const DOT: Record<'planned' | 'ongoing' | 'done' | 'risk' | 'check', string> = {
  planned: 'bg-ink-3', ongoing: 'bg-info', done: 'bg-success', risk: 'bg-danger', check: 'bg-warning',
}
