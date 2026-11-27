// Leave credits allocation for DTR (client interview, Nov 2026; CONSULTATION_FIXES B9).
// Same rules as public.leave_credits SQL function:
// - Each calendar year 5 sick + 5 vacation credits.
// - Counted Monday to Saturday only (Sunday is rest day; extract(isodow) <> 7).
// - Sick leave uses sick credits first, then vacation credits.
// - Vacation and emergency leave use vacation credits.
// - Days past credits, and unpaid leave, are 'without_credits', except vacation days HR took from sick
//   credits on approval (the leave's sick_days, 28 Nov): those use sick credits.
// - Other leave types (wedding, maternal, paternal) do NOT use credits; labeled 'other'.

import type { LeaveCreditCategory } from './types'

export interface ApprovedLeaveRow {
  id: string
  technician_id: string
  start_date: string
  end_date: string
  leave_type: string
  status: string
  sick_days?: number
}

export interface DayLeaveInfo {
  label: LeaveCreditCategory
  leaveType: string
}

/** Generates all dates in 'YYYY-MM-DD' from start to end inclusive. */
function dateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = []
  const cur = new Date(`${startStr}T12:00:00+08:00`)
  const end = new Date(`${endStr}T12:00:00+08:00`)
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

/**
 * Walks an employee's approved leave days from Jan 1 of the year up to the cut-off end date,
 * assigning credit labels ('sick', 'vacation', 'without_credits', 'other') in chronological order.
 */
export function buildEmployeeLeaveMap(
  leaves: ApprovedLeaveRow[],
  yearStart: string,
  cutoffEnd: string
): Map<string, DayLeaveInfo> {
  const leaveMap = new Map<string, DayLeaveInfo>()

  // 1. Expand all approved leave days between yearStart and cutoffEnd, skipping Sundays
  const candidateDays: { dateStr: string; leaveType: string; leaveId: string }[] = []
  const fromSick = new Map(leaves.map((l) => [l.id, l.sick_days ?? 0])) // days left that HR moved to sick credits
  const seenDays = new Set<string>()

  for (const l of leaves) {
    const s = l.start_date < yearStart ? yearStart : l.start_date
    const e = l.end_date > cutoffEnd ? cutoffEnd : l.end_date
    if (s > e) continue

    for (const dStr of dateRange(s, e)) {
      if (seenDays.has(dStr)) continue
      // Monday to Saturday only (0 = Sunday in JS)
      const dayOfWeek = new Date(`${dStr}T12:00:00+08:00`).getDay()
      if (dayOfWeek === 0) continue

      seenDays.add(dStr)
      candidateDays.push({ dateStr: dStr, leaveType: l.leave_type, leaveId: l.id })
    }
  }

  // 2. Sort leave days chronologically
  candidateDays.sort((a, b) => a.dateStr.localeCompare(b.dateStr))

  // 3. Walk days with 5 sick + 5 vacation credit balances
  let sickCredits = 5
  let vacationCredits = 5

  for (const day of candidateDays) {
    const t = (day.leaveType || '').toLowerCase().trim()

    if (t === 'sick') {
      if (sickCredits > 0) {
        sickCredits -= 1
        leaveMap.set(day.dateStr, { label: 'sick', leaveType: day.leaveType })
      } else if (vacationCredits > 0) {
        vacationCredits -= 1
        leaveMap.set(day.dateStr, { label: 'vacation', leaveType: day.leaveType })
      } else {
        leaveMap.set(day.dateStr, { label: 'without_credits', leaveType: day.leaveType })
      }
    } else if (t === 'vacation' || t === 'emergency') {
      if (vacationCredits > 0) {
        vacationCredits -= 1
        leaveMap.set(day.dateStr, { label: 'vacation', leaveType: day.leaveType })
      } else if ((fromSick.get(day.leaveId) ?? 0) > 0 && sickCredits > 0) {
        fromSick.set(day.leaveId, fromSick.get(day.leaveId)! - 1)
        sickCredits -= 1
        leaveMap.set(day.dateStr, { label: 'sick', leaveType: day.leaveType })
      } else {
        leaveMap.set(day.dateStr, { label: 'without_credits', leaveType: day.leaveType })
      }
    } else if (t === 'unpaid') {
      leaveMap.set(day.dateStr, { label: 'without_credits', leaveType: day.leaveType })
    } else {
      // wedding, maternal, paternal, bereavement, etc.
      leaveMap.set(day.dateStr, { label: 'other', leaveType: day.leaveType })
    }
  }

  return leaveMap
}
