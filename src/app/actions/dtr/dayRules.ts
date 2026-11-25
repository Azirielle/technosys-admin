import type { DailyAuditRecord, DtrJob, LeaveCreditCategory } from './types'
import { getManilaDayOfWeek, getManilaTimeString } from './timeUtils'
import { evaluatePunch, type PunchLogData } from './punchRules'

export { SHIFT_START, GRACE_MINUTES } from './punchRules'

export interface DayEvaluationContext {
  dateStr: string
  todayStr: string
  profile: {
    id: string
    hire_date: string | null
  }
  sched?: DtrJob
  log?: PunchLogData
  leave?: {
    leave_type: string
  }
  leaveCategory?: LeaveCreditCategory | null
  correction?: {
    id: string
    reason: string
    actor_role: string
    created_at: string
  }
  holiday?: {
    name: string
    type: string
  }
  approvedOtHours: number
  isV2: boolean
}

export interface DayEvaluationResult {
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

function baseRecord(
  dateStr: string,
  dayOfWeek: string,
  isSunday: boolean,
  isHoliday: boolean,
  isCorrected: boolean,
  correctionDetails?: DailyAuditRecord['correctionDetails']
): DailyAuditRecord {
  return {
    date: dateStr,
    dayOfWeek,
    timeLogId: null,
    rawTimeIn: null,
    rawTimeOut: null,
    scheduledStart: null,
    scheduledEnd: null,
    actualTimeIn: null,
    actualTimeOut: null,
    grossHours: 0,
    hoursWorked: 0,
    lateMinutes: 0,
    regOtHours: 0,
    sunHolidayOtHours: 0,
    nightDiffHours: 0,
    isSunday,
    isHoliday,
    status: 'off_duty',
    isManualEntry: false,
    isCorrected,
    correctionDetails,
  }
}

export function evaluateDay(ctx: DayEvaluationContext): DayEvaluationResult {
  const {
    dateStr,
    todayStr,
    profile,
    sched,
    log,
    leave,
    leaveCategory,
    correction,
    holiday,
    approvedOtHours,
    isV2,
  } = ctx

  const dayDate = new Date(`${dateStr}T12:00:00+08:00`)
  const dayOfWeek = getManilaDayOfWeek(dayDate)
  const isSunday = dayDate.getDay() === 0
  const isHoliday = !!holiday
  // Days before someone was hired are never absences
  const counts = dateStr < todayStr && !(profile.hire_date && dateStr < profile.hire_date)

  // Matching DTR correction on this date
  const isCorrected = !!correction
  const correctionDetails = correction
    ? {
        id: correction.id,
        reason: correction.reason,
        actorRole: correction.actor_role,
        createdAt: correction.created_at,
      }
    : undefined

  if (log && log.app_time_in) {
    return evaluatePunch({
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
    })
  }

  const zeroMetrics = {
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

  const scheduledStart = sched ? getManilaTimeString(new Date(sched.start_time)) : null
  const scheduledEnd = sched && sched.end_time ? getManilaTimeString(new Date(sched.end_time)) : null
  const rec = baseRecord(dateStr, dayOfWeek, isSunday, isHoliday, isCorrected, correctionDetails)

  if (leave && !isSunday && !isHoliday) {
    // A leave only uses up workdays: a Sunday or holiday inside it stays a rest day or holiday.
    const cat = leaveCategory || 'other'
    let note = `Official ${leave.leave_type.toUpperCase()} leave`
    let sickLeaveDays = 0
    let vacationLeaveDays = 0
    let salaryDeductionDays = 0
    let otherLeaveDays = 0
    let approvedLeaves = 1
    let absences = 0

    if (cat === 'sick') {
      sickLeaveDays = 1
      note = 'Sick leave'
    } else if (cat === 'vacation') {
      vacationLeaveDays = 1
      note = 'Vacation leave'
    } else if (cat === 'without_credits') {
      salaryDeductionDays = 1
      approvedLeaves = 0
      absences = 1
      note = 'Salary deduction (no credits)'
    } else {
      otherLeaveDays = 1
      note = leave.leave_type ? `${leave.leave_type} leave` : 'Other leave'
    }

    return {
      ...zeroMetrics,
      sickLeaveDays,
      vacationLeaveDays,
      salaryDeductionDays,
      otherLeaveDays,
      approvedLeaves,
      absences,
      record: {
        ...rec,
        scheduledStart,
        scheduledEnd,
        scheduleClient: sched?.client_name,
        holidayName: null,
        status: 'approved_leave',
        leaveType: leave.leave_type,
        leaveCategory: cat,
        notes: note,
      },
    }
  }

  if (sched && counts) {
    // Employee had a job but did not time in
    return {
      ...zeroMetrics,
      absences: 1,
      salaryDeductionDays: 1,
      record: {
        ...rec,
        scheduledStart,
        scheduledEnd,
        scheduleClient: sched.client_name,
        holidayName: holiday?.name,
        status: 'absent',
        notes: 'Salary deduction (absent)',
      },
    }
  }

  if (isSunday) {
    return {
      ...zeroMetrics,
      record: {
        ...rec,
        holidayName: holiday?.name,
        status: 'rest_day',
        notes: 'Sunday Rest Day',
      },
    }
  }

  if (isHoliday) {
    return {
      ...zeroMetrics,
      record: {
        ...rec,
        holidayName: holiday.name,
        status: 'holiday',
        notes: `Official Holiday: ${holiday.name}`,
      },
    }
  }

  if (counts) {
    // A Monday–Saturday workday that has passed, with no time-in, no leave and no holiday.
    return {
      ...zeroMetrics,
      absences: 1,
      salaryDeductionDays: 1,
      record: {
        ...rec,
        status: 'absent',
        notes: 'Salary deduction (absent)',
      },
    }
  }

  // Today (not over yet) or a day still to come: not counted.
  return {
    ...zeroMetrics,
    record: {
      ...rec,
      status: 'off_duty',
      notes:
        dateStr === todayStr
          ? 'No time-in yet today'
          : dateStr < todayStr
          ? 'Before hire date'
          : 'Upcoming day',
    },
  }
}
