import type { DailyAuditRecord, DtrJob } from './types'
import { calculateNightDiffHours, getManilaTimeString } from './timeUtils'

// Technocycle's DTR rules (confirmed by Andrew, 15 Nov 2026):
// - The regular shift starts at 8:00 AM; a job's own start time is used on job days.
// - No grace period (client, Nov 2026): 1 minute after the start (8:00 or the job's time) is late, counted from the start time.
// - Monday to Saturday are workdays; Sunday is the rest day.
// - Overtime counts only up to the hours HR approved in an overtime request for that day.
export const SHIFT_START = '08:00'
export const GRACE_MINUTES = 0

export interface PunchLogData {
  id: string
  app_time_in: string | null
  app_time_out: string | null
  total_hours: number | string | null
  is_manual_entry?: boolean | null
  is_mocked?: boolean | null
  gps_accuracy?: number | null
  is_suspicious?: boolean | null
  office_check_in_at?: string | null
}

export interface EvaluatePunchParams {
  dateStr: string
  dayOfWeek: string
  isSunday: boolean
  isHoliday: boolean
  holiday?: { name: string; type: string }
  sched?: DtrJob
  log: PunchLogData
  leave?: { leave_type: string }
  isCorrected: boolean
  correctionDetails?: DailyAuditRecord['correctionDetails']
  approvedOtHours: number
  isV2: boolean
}

export interface PunchEvaluationResult {
  record: DailyAuditRecord
  daysWorked: number
  netHours: number
  lateCount: number
  lateMinutes: number
  regOtHours: number
  sunHolidayOtHours: number
  sundayHours: number
  regularHolidayHours: number
  specialHolidayHours: number
  nightDiffHours: number
  sickLeaveDays: number
  vacationLeaveDays: number
  salaryDeductionDays: number
  otherLeaveDays: number
  absences: number
  approvedLeaves: number
}

export function evaluatePunch(params: EvaluatePunchParams): PunchEvaluationResult {
  const {
    dateStr,
    dayOfWeek,
    isSunday,
    isHoliday,
    holiday,
    sched,
    log,
    leave,
    isCorrected,
    correctionDetails,
    approvedOtHours,
    isV2,
  } = params

  const scheduledStart = sched ? getManilaTimeString(new Date(sched.start_time)) : null
  const scheduledEnd = sched && sched.end_time ? getManilaTimeString(new Date(sched.end_time)) : null

  const inDate = new Date(log.app_time_in!)
  const outDate = log.app_time_out ? new Date(log.app_time_out) : null
  const actualTimeIn = getManilaTimeString(inDate)
  const actualTimeOut = outDate ? getManilaTimeString(outDate) : null

  if (!outDate) {
    // Unclosed punch
    const record: DailyAuditRecord = {
      date: dateStr,
      dayOfWeek,
      timeLogId: log.id,
      rawTimeIn: log.app_time_in,
      rawTimeOut: null,
      scheduledStart,
      scheduledEnd,
      scheduleClient: sched?.client_name,
      actualTimeIn,
      actualTimeOut: 'Still Open',
      grossHours: 0,
      hoursWorked: 0,
      lateMinutes: 0,
      regOtHours: 0,
      sunHolidayOtHours: 0,
      nightDiffHours: 0,
      isSunday,
      isHoliday,
      holidayName: holiday?.name,
      status: 'unclosed',
      notes:
        log && leave
          ? `Shift unclosed; Employee attended on approved ${leave.leave_type || 'paid'} leave`
          : 'Shift currently ongoing or missing clock-out',
      isManualEntry: !!log.is_manual_entry,
      isMocked: !!log.is_mocked,
      gpsAccuracy: log.gps_accuracy ?? null,
      isSuspicious: !!log.is_suspicious,
      hasLeaveCollision: !!(log && leave),
      leaveType: leave?.leave_type || null,
      isCorrected,
      correctionDetails,
    }

    return {
      record,
      daysWorked: 0,
      netHours: 0,
      lateCount: 0,
      lateMinutes: 0,
      regOtHours: 0,
      sunHolidayOtHours: 0,
      sundayHours: 0,
      regularHolidayHours: 0,
      specialHolidayHours: 0,
      nightDiffHours: 0,
      sickLeaveDays: 0,
      vacationLeaveDays: 0,
      salaryDeductionDays: 0,
      otherLeaveDays: 0,
      absences: 0,
      approvedLeaves: 0,
    }
  }

  // Compute gross & net hours (deduct 1h unpaid meal break if shift > 5h)
  const grossHours = Math.max(0, (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60))
  // Work v2: the database already counted from the start time, to the end time + approved overtime
  const netHours =
    isV2 && log.total_hours != null
      ? Number(log.total_hours)
      : grossHours > 5
      ? Math.max(0, grossHours - 1)
      : grossHours

  // Late Calculation:
  // If scheduled, compare to sched.start_time.
  // Otherwise compare to 09:00 AM Manila time default.
  let expectedStartTimeMs: number
  if (sched) {
    expectedStartTimeMs = new Date(sched.start_time).getTime()
  } else {
    const defStart = new Date(`${dateStr}T${SHIFT_START}:00+08:00`)
    expectedStartTimeMs = defStart.getTime()
  }

  // Late from the first minute after the start; the minutes count from the start time.
  // When an office check-in exists (advance time-in at Pacita), late is judged by office check-in time (can't control van).
  let dayLateMins = 0
  let lateCount = 0
  const lateCheckTime = log.office_check_in_at ? new Date(log.office_check_in_at).getTime() : inDate.getTime()
  const minutesAfterStart = Math.floor((lateCheckTime - expectedStartTimeMs) / (1000 * 60))
  if (minutesAfterStart > GRACE_MINUTES) {
    dayLateMins = minutesAfterStart
    lateCount = 1
  }

  // Overtime & Night Diff:
  // Work v2: night hours only inside the counted window (start time → end time + approved overtime), like the hours
  const ndIn =
    isV2 && sched
      ? new Date(Math.max(inDate.getTime(), new Date(sched.start_time).getTime()))
      : inDate
  const ndOut =
    isV2 && sched?.end_time
      ? new Date(Math.min(outDate.getTime(), new Date(sched.end_time).getTime() + approvedOtHours * 3600000))
      : outDate
  const dayNdHours = calculateNightDiffHours(ndIn, ndOut)

  let dayRegOt = 0
  let daySunHolOt = 0
  let sundayHours = 0
  let regularHolidayHours = 0
  let specialHolidayHours = 0
  let unapprovedExtra = 0

  if (isHoliday || isSunday) {
    // Entire work is Sunday / Holiday OT
    daySunHolOt = netHours
    // A holiday on a Sunday counts as the holiday
    if (holiday?.type === 'regular') regularHolidayHours = netHours
    else if (holiday) specialHolidayHours = netHours
    else sundayHours = netHours
  } else {
    // Regular workday: hours beyond 8 hours count as Reg OT
    if (netHours > 8) {
      dayRegOt = Math.min(netHours - 8, approvedOtHours)
      unapprovedExtra = netHours - 8 - dayRegOt
    }
  }

  let status: DailyAuditRecord['status'] = 'present'
  if (dayRegOt > 0 || daySunHolOt > 0) {
    status = 'overtime'
  } else if (dayLateMins > 0) {
    status = 'late'
  }

  const record: DailyAuditRecord = {
    date: dateStr,
    dayOfWeek,
    timeLogId: log.id,
    rawTimeIn: log.app_time_in,
    rawTimeOut: log.app_time_out,
    scheduledStart,
    scheduledEnd,
    scheduleClient: sched?.client_name,
    actualTimeIn,
    actualTimeOut,
    grossHours: parseFloat(grossHours.toFixed(1)),
    hoursWorked: parseFloat(netHours.toFixed(1)),
    lateMinutes: dayLateMins,
    regOtHours: parseFloat(dayRegOt.toFixed(1)),
    sunHolidayOtHours: parseFloat(daySunHolOt.toFixed(1)),
    unapprovedOtHours: parseFloat(unapprovedExtra.toFixed(1)),
    nightDiffHours: parseFloat(dayNdHours.toFixed(1)),
    isSunday,
    isHoliday,
    holidayName: holiday ? `${holiday.name} (${holiday.type})` : null,
    status,
    isManualEntry: !!log.is_manual_entry,
    isMocked: !!log.is_mocked,
    gpsAccuracy: log.gps_accuracy ?? null,
    isSuspicious: !!log.is_suspicious,
    hasLeaveCollision: !!(log && leave),
    leaveType: leave?.leave_type || null,
    notes:
      [
        log && leave ? `Attended work on approved ${leave.leave_type || 'paid'} leave` : null,
        unapprovedExtra >= 0.1
          ? `${unapprovedExtra.toFixed(1)} h past 8 hours without an approved overtime request`
          : null,
      ]
        .filter(Boolean)
        .join('. ') || undefined,
    isCorrected,
    correctionDetails,
  }

  return {
    record,
    daysWorked: 1,
    netHours,
    lateCount,
    lateMinutes: dayLateMins,
    regOtHours: dayRegOt,
    sunHolidayOtHours: daySunHolOt,
    sundayHours,
    regularHolidayHours,
    specialHolidayHours,
    nightDiffHours: dayNdHours,
    sickLeaveDays: 0,
    vacationLeaveDays: 0,
    salaryDeductionDays: 0,
    otherLeaveDays: 0,
    absences: 0,
    approvedLeaves: 0,
  }
}
