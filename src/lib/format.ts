// Date and time formatting for screens, always in Manila time ("14 Nov", "8:05 AM", "2 h ago").
const TZ = 'Asia/Manila'

/** "8:05 AM" */
export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

/** "14 Nov". Accepts a full timestamp or a plain "2026-11-14" date. */
export function formatDay(isoOrYmd: string) {
  const d = isoOrYmd.length === 10 ? new Date(`${isoOrYmd}T12:00:00+08:00`) : new Date(isoOrYmd)
  return new Intl.DateTimeFormat('en-PH', { timeZone: TZ, day: 'numeric', month: 'short' }).format(d)
}

/** "Saturday, 14 November 2026" from "2026-11-14". */
export function formatLongDate(ymd: string) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${ymd}T12:00:00+08:00`),
  )
}

/** "5 min ago", "3 h ago", "2 days ago". */
export function formatAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** "16 Nov" or "16 Nov to 17 Nov". */
export function formatDayRange(start: string, end: string) {
  return end && end !== start ? `${formatDay(start)} to ${formatDay(end)}` : formatDay(start)
}
