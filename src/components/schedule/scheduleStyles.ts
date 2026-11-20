// Scheduling board colours as Tailwind classes (tokens only): job blocks by status, and the small status pills.
import type { JobStatus } from '@/components/jobs/jobTypes'
import type { Tone } from './scheduleMath'

/** Job cards: white with a coloured stripe on the left. Grey planned · blue in progress · green done (same as the agenda dots) */
export const JOB_TONE: Record<JobStatus, string> = {
  planned: 'bg-surface ring-1 ring-inset ring-line-strong border-l-[3px] border-l-ink-3 hover:bg-surface-hover',
  ongoing: 'bg-surface ring-1 ring-inset ring-line-strong border-l-[3px] border-l-info hover:bg-surface-hover',
  done: 'bg-surface ring-1 ring-inset ring-line-strong border-l-[3px] border-l-success hover:bg-surface-hover',
  cancelled: 'bg-surface-soft border-l-[3px] border-l-ink-3 opacity-60',
}

/** A VIP squeeze-in stands out on the boards: yellow edge and fill */
export const VIP_TONE = 'border-l-warning bg-warning-soft hover:bg-warning-soft'

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

/** Plain coloured text for a status line (attendance under a name) */
export const STATUS_TEXT: Record<Tone, string> = {
  neutral: 'text-ink-3',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/** A short word on a job card for its status (nothing for planned) */
export const JOB_STATUS_WORD: Partial<Record<JobStatus, string>> = { ongoing: 'In progress', done: 'Done' }
