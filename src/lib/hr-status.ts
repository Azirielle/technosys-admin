// Date helpers for leave requests and tickets: "Nov 16 – Nov 17, 2026" (with day count) and "2h ago".
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
