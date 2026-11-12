/**
 * HR Status Vocabulary & Formatting Utilities
 * Bridges PostgreSQL database constraints with plain-language, executive-grade UI presentation.
 */

export interface LeaveStatusInfo {
  label: string
  dbValue: 'pending' | 'approved' | 'rejected'
  description: string
  bgClass: string
  textClass: string
  borderClass: string
  dotClass: string
}

export interface TicketStatusInfo {
  label: string
  description: string
  bgClass: string
  textClass: string
  borderClass: string
}

/**
 * Maps raw database leave status to self-explanatory HR display badge.
 * Database check constraint: CHECK (status IN ('pending', 'approved', 'rejected'))
 */
export function getLeaveStatusInfo(status: string | null | undefined): LeaveStatusInfo {
  const normalized = (status || '').toLowerCase().trim()

  switch (normalized) {
    case 'approved':
      return {
        label: 'Approved',
        dbValue: 'approved',
        description: 'The application has been approved and coverage is noted.',
        bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        borderClass: 'border-emerald-500/30 dark:border-emerald-500/30',
        dotClass: 'bg-emerald-500',
      }
    case 'rejected':
    case 'declined':
      return {
        label: 'Declined',
        dbValue: 'rejected',
        description: 'The application was not approved with reason recorded.',
        bgClass: 'bg-rose-500/10 dark:bg-rose-500/15',
        textClass: 'text-rose-700 dark:text-rose-300',
        borderClass: 'border-rose-500/30 dark:border-rose-500/30',
        dotClass: 'bg-rose-500',
      }
    case 'pending':
    default:
      return {
        label: 'Pending review',
        dbValue: 'pending',
        description: 'HR needs to review the application and make a decision.',
        bgClass: 'bg-amber-500/10 dark:bg-amber-500/15',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-500/30 dark:border-amber-500/30',
        dotClass: 'bg-amber-500',
      }
  }
}

/**
 * Maps raw database ticket status to self-explanatory HR display badge.
 * Tickets DB values: 'open', 'in_progress', 'resolved', 'closed'
 */
export function getTicketStatusInfo(
  status: string | null | undefined,
  lastSenderRole?: string | null
): TicketStatusInfo {
  const normalized = (status || '').toLowerCase().trim()

  if (normalized === 'resolved') {
    return {
      label: 'Resolved',
      description: 'The concern has been addressed and finalized.',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      textClass: 'text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-500/30 dark:border-emerald-500/30',
    }
  }

  if (normalized === 'closed') {
    return {
      label: 'Closed',
      description: 'The ticket has been closed without further action.',
      bgClass: 'bg-zinc-500/10 dark:bg-zinc-500/15',
      textClass: 'text-zinc-700 dark:text-zinc-300',
      borderClass: 'border-zinc-500/30 dark:border-zinc-500/30',
    }
  }

  if (normalized === 'in_progress') {
    // If the last response was already from HR or AI, we are waiting for employee response
    if (lastSenderRole === 'admin' || lastSenderRole === 'ai') {
      return {
        label: 'Waiting for response',
        description: 'HR replied. Waiting for technician to respond before work continues.',
        bgClass: 'bg-sky-500/10 dark:bg-sky-500/15',
        textClass: 'text-sky-700 dark:text-sky-300',
        borderClass: 'border-sky-500/30 dark:border-sky-500/30',
      }
    }
    return {
      label: 'In progress',
      description: 'HR or technician is actively communicating on this inquiry.',
      bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      textClass: 'text-indigo-700 dark:text-indigo-300',
      borderClass: 'border-indigo-500/30 dark:border-indigo-500/30',
    }
  }

  // Default / 'open'
  return {
    label: 'New',
    description: 'HR has not started handling it yet.',
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/15',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500/30 dark:border-amber-500/30',
  }
}

/**
 * Calculates calendar duration between two dates and outputs formatted string.
 */
export function formatLeaveDuration(startDateStr: string, endDateStr: string): {
  dateRangeStr: string
  daysCount: number
} {
  try {
    const start = new Date(startDateStr)
    const end = new Date(endDateStr)

    const diffTime = Math.abs(end.getTime() - start.getTime())
    const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1)

    const startFormatted = start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    const endFormatted = end.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined,
    })

    const yearStr = end.toLocaleDateString(undefined, { year: 'numeric' })

    const dateRangeStr =
      startFormatted === endFormatted
        ? `${startFormatted}, ${yearStr}`
        : `${startFormatted} – ${endFormatted}, ${yearStr}`

    return { dateRangeStr, daysCount }
  } catch {
    return { dateRangeStr: `${startDateStr} – ${endDateStr}`, daysCount: 1 }
  }
}

/**
 * Human-readable relative time (e.g., "2 hours ago", "Just now", "Yesterday")
 */
export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recently'
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}
