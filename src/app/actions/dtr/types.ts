export type LeaveCreditCategory = 'sick' | 'vacation' | 'without_credits' | 'other';

export interface DailyAuditRecord {
  date: string; // 'YYYY-MM-DD'
  dayOfWeek: string; // 'Mon', 'Tue', etc.
  timeLogId?: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduleClient?: string | null;
  actualTimeIn: string | null;
  actualTimeOut: string | null;
  rawTimeIn?: string | null;
  rawTimeOut?: string | null;
  grossHours: number;
  hoursWorked: number; // net of 1h lunch if gross > 5h
  lateMinutes: number;
  /** Hours past 8 with no approved overtime request (not counted as overtime). */
  unapprovedOtHours?: number;
  regOtHours: number;
  sunHolidayOtHours: number;
  nightDiffHours: number;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string | null;
  status: 'present' | 'late' | 'overtime' | 'absent' | 'approved_leave' | 'rest_day' | 'holiday' | 'off_duty' | 'unclosed' | 'in_house';
  leaveType?: string | null;
  /** Leave category under client leave credit rules: sick, vacation, without_credits, or other */
  leaveCategory?: LeaveCreditCategory | null;
  notes?: string;
  isManualEntry?: boolean;
  isMocked?: boolean;
  gpsAccuracy?: number | null;
  isSuspicious?: boolean;
  hasLeaveCollision?: boolean;
  isCorrected?: boolean;
  correctionDetails?: {
    id: string;
    reason: string;
    actorRole: string;
    createdAt: string;
  };
}

export interface EmployeeAuditSummary {
  id: string;
  name: string;
  role: 'technician' | 'helper';
  level: string;
  status: string;
  branch_id?: string | null;
  daysWorked: number;
  totalHours: number;
  lateCount: number;
  totalLateMinutes: number;
  regOtHours: number;
  sunHolidayOtHours: number;
  /** Split of sunHolidayOtHours (client, Nov 2026): hours only, no pay rates */
  sundayHours: number;
  regularHolidayHours: number;
  specialHolidayHours: number;
  nightDiffHours: number;
  /** Days on approved sick leave paid with sick credits */
  sickLeaveDays: number;
  /** Days on approved vacation/emergency leave paid with vacation credits */
  vacationLeaveDays: number;
  /** Days without credits (exhausted leave credits / unpaid) + unexcused absent days */
  salaryDeductionDays: number;
  /** Other approved leave days not using credits (wedding, maternal, paternal) */
  otherLeaveDays: number;
  absences: number;
  approvedLeaves: number;
  dailyBreakdown: DailyAuditRecord[];
}

export interface DtrResult {
  success: boolean;
  periodLabel: string;
  startDate: string;
  endDate: string;
  records: EmployeeAuditSummary[];
  error?: string;
}

export type DtrJob = {
  id: string;
  technician_id: string | null;
  client_name: string;
  location: string;
  start_time: string;
  end_time: string | null;
  status: string | null;
  work_type?: string | null;
}
