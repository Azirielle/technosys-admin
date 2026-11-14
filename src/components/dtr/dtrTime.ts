// Time helpers for punch corrections: Manila "HH:MM", building the saved timestamps, and a live preview.
import type { DailyAuditRecord } from '@/app/actions/audit'

const WORK_START = '08:00'
const REGULAR_HOURS = 8

/** "08:05" in Manila time from an ISO timestamp. */
export function manilaHHMM(iso: string | null | undefined, fallback: string) {
  if (!iso) return fallback
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(
    new Date(iso),
  )
  const hour = (parts.find((p) => p.type === 'hour')?.value ?? '08').replace('24', '00')
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

/** The day after "2026-11-14" → "2026-11-15". */
function nextDay(ymd: string) {
  const d = new Date(`${ymd}T12:00:00+08:00`)
  d.setTime(d.getTime() + 24 * 3600 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d)
}

/** Timestamps to save for a corrected shift. `endsNextDay` is for shifts past midnight. */
export function shiftTimestamps(date: string, timeIn: string, timeOut: string, endsNextDay: boolean) {
  return {
    inIso: `${date}T${timeIn}:00+08:00`,
    outIso: `${endsNextDay ? nextDay(date) : date}T${timeOut}:00+08:00`,
  }
}

export interface CorrectionPreview {
  netHours: number
  mealBreakDeducted: boolean
  lateMinutes: number
  regularOt: number
  sundayHolidayOt: number
}

/** What the corrected day will count as. null when time out isn't after time in. */
export function previewCorrection(day: DailyAuditRecord, timeIn: string, timeOut: string, endsNextDay: boolean): CorrectionPreview | null {
  const { inIso, outIso } = shiftTimestamps(day.date, timeIn, timeOut, endsNextDay)
  const start = new Date(inIso).getTime()
  const end = new Date(outIso).getTime()
  if (isNaN(start) || isNaN(end) || end <= start) return null

  const gross = (end - start) / 3600000
  const net = gross > 5 ? gross - 1 : gross // 1-hour meal break on shifts over 5 hours
  const workStart = new Date(`${day.date}T${WORK_START}:00+08:00`).getTime()
  const offDay = day.isSunday || day.isHoliday

  return {
    netHours: Math.round(net * 10) / 10,
    mealBreakDeducted: gross > 5,
    lateMinutes: Math.max(0, Math.floor((start - workStart) / 60000)),
    regularOt: offDay ? 0 : Math.round(Math.max(0, net - REGULAR_HOURS) * 10) / 10,
    sundayHolidayOt: offDay ? Math.round(net * 10) / 10 : 0,
  }
}
