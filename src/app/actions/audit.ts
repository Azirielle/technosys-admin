"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { verifyRoleAccess, UserRole } from "@/lib/permissions"
import { getBranchFilter } from "@/lib/branch-filter"

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
  regOtHours: number;
  sunHolidayOtHours: number;
  nightDiffHours: number;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string | null;
  status: 'present' | 'late' | 'overtime' | 'absent' | 'approved_leave' | 'rest_day' | 'holiday' | 'off_duty' | 'unclosed';
  leaveType?: string | null;
  notes?: string;
  isManualEntry?: boolean;
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
  base_salary: number;
  branch_id?: string | null;
  daysWorked: number;
  totalHours: number;
  lateCount: number;
  totalLateMinutes: number;
  regOtHours: number;
  sunHolidayOtHours: number;
  nightDiffHours: number;
  absences: number;
  approvedLeaves: number;
  dailyBreakdown: DailyAuditRecord[];
}

export interface AuditPayrollResult {
  success: boolean;
  periodLabel: string;
  startDate: string;
  endDate: string;
  records: EmployeeAuditSummary[];
  error?: string;
}

// Helpers for Philippine Time (UTC+8)
function getManilaDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);
}

function getManilaTimeString(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function getManilaDayOfWeek(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  }).format(date);
}

function getManilaHourAndMinute(date: Date): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  let hours = 0;
  let minutes = 0;
  for (const p of parts) {
    if (p.type === 'hour') hours = parseInt(p.value, 10);
    if (p.type === 'minute') minutes = parseInt(p.value, 10);
  }
  if (hours === 24) hours = 0;
  return { hours, minutes };
}

// Calculate Night Shift Differential (22:00 to 06:00 Asia/Manila)
function calculateNightDiffHours(inDate: Date, outDate: Date): number {
  if (outDate <= inDate) return 0;
  
  let totalNdMs = 0;
  // Iterate by 30-minute slices or mathematical intervals
  // Since shifts are typically <= 24 hours, check 30m steps
  const STEP_MS = 15 * 60 * 1000; // 15-minute resolution
  let current = inDate.getTime();
  const end = outDate.getTime();

  while (current < end) {
    const next = Math.min(current + STEP_MS, end);
    const midDate = new Date((current + next) / 2);
    const { hours } = getManilaHourAndMinute(midDate);
    
    // Philippine Labor Code Art. 86: 10:00 PM (22:00) to 6:00 AM (06:00)
    if (hours >= 22 || hours < 6) {
      totalNdMs += (next - current);
    }
    current = next;
  }

  return totalNdMs / (1000 * 60 * 60);
}

// Generate array of YYYY-MM-DD dates between start and end inclusive
function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDateStr}T12:00:00+08:00`);
  const end = new Date(`${endDateStr}T12:00:00+08:00`);

  while (curr <= end) {
    dates.push(getManilaDateString(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export async function getAuditPayrollRecords(
  startDate: string,
  endDate: string,
  roleFilter: 'all' | 'technician' | 'helper' = 'all'
): Promise<AuditPayrollResult> {
  try {
    const { authorized } = await verifyRoleAccess('attendance', false);
    if (!authorized) {
      return {
        success: false,
        periodLabel: '',
        startDate,
        endDate,
        records: [],
        error: 'Unauthorized. Attendance audit permissions required.',
      };
    }

    const filterBranchId = await getBranchFilter();

    // 1. Build ISO bounds for UTC queries
    const utcStart = new Date(`${startDate}T00:00:00+08:00`).toISOString();
    const utcEnd = new Date(`${endDate}T23:59:59.999+08:00`).toISOString();

    // 2. Fetch Profiles (technicians and helpers)
    let profileQuery = supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, technician_level, employment_status, base_salary, branch_id')
      .in('role', roleFilter === 'all' ? ['technician', 'helper'] : [roleFilter])
      .order('full_name');

    if (filterBranchId) {
      profileQuery = profileQuery.eq('branch_id', filterBranchId);
    }

    const { data: profiles, error: profileErr } = await profileQuery;
    if (profileErr) throw profileErr;
    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        periodLabel: `${startDate} to ${endDate}`,
        startDate,
        endDate,
        records: [],
      };
    }

    const profileIds = profiles.map(p => p.id);

    // 3. Batch Fetch Time Logs for the period
    const { data: timeLogs, error: logsErr } = await supabaseAdmin
      .from('time_logs')
      .select('id, technician_id, app_time_in, app_time_out, total_hours, status, is_manual_entry')
      .in('technician_id', profileIds)
      .gte('app_time_in', utcStart)
      .lte('app_time_in', utcEnd)
      .order('app_time_in', { ascending: true });

    if (logsErr) throw logsErr;

    // 4. Batch Fetch Schedules for the period
    const { data: schedules, error: schedErr } = await supabaseAdmin
      .from('schedules')
      .select('id, technician_id, client_name, location, start_time, end_time, status')
      .in('technician_id', profileIds)
      .gte('start_time', utcStart)
      .lte('start_time', utcEnd)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    if (schedErr) throw schedErr;

    // 5. Batch Fetch Holidays
    const { data: holidays, error: holErr } = await supabaseAdmin
      .from('holidays')
      .select('id, name, holiday_date, multiplier, is_active')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .eq('is_active', true);

    if (holErr) throw holErr;

    // 6. Batch Fetch Approved Leaves
    const { data: leaves, error: leaveErr } = await supabaseAdmin
      .from('leaves')
      .select('id, technician_id, start_date, end_date, leave_type, status')
      .in('technician_id', profileIds)
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .eq('status', 'approved');

    if (leaveErr) throw leaveErr;

    // 7. Batch Fetch DTR Corrections in Range
    const { data: corrections } = await supabaseAdmin
      .from('time_log_corrections')
      .select('id, time_log_id, technician_id, target_date, reason, actor_role, created_at')
      .in('technician_id', profileIds)
      .gte('target_date', startDate)
      .lte('target_date', endDate)
      .order('created_at', { ascending: false });

    // Create lookup maps for fast access
    const holidayMap = new Map<string, { name: string; multiplier: number }>();
    (holidays || []).forEach(h => {
      holidayMap.set(h.holiday_date, { name: h.name, multiplier: Number(h.multiplier || 1.0) });
    });

    const datesList = getDatesInRange(startDate, endDate);

    // 8. Aggregate metrics per employee
    const aggregatedSummaries: EmployeeAuditSummary[] = profiles.map(profile => {
      const empLogs = (timeLogs || []).filter(l => l.technician_id === profile.id);
      const empScheds = (schedules || []).filter(s => s.technician_id === profile.id);
      const empLeaves = (leaves || []).filter(lv => lv.technician_id === profile.id);
      const empCorrections = (corrections || []).filter(c => c.technician_id === profile.id);

      let daysWorked = 0;
      let totalHours = 0;
      let lateCount = 0;
      let totalLateMinutes = 0;
      let regOtHours = 0;
      let sunHolidayOtHours = 0;
      let nightDiffHours = 0;
      let absences = 0;
      let approvedLeaves = 0;

      const dailyBreakdown: DailyAuditRecord[] = [];

      datesList.forEach(dateStr => {
        const dayDate = new Date(`${dateStr}T12:00:00+08:00`);
        const dayOfWeek = getManilaDayOfWeek(dayDate);
        const isSunday = dayDate.getDay() === 0;
        const holiday = holidayMap.get(dateStr);
        const isHoliday = !!holiday;

        // Matching Schedule on this date (in Manila time)
        const sched = empScheds.find(s => {
          const sDate = getManilaDateString(new Date(s.start_time));
          return sDate === dateStr;
        });

        // Matching Time Log on this date (in Manila time)
        const log = empLogs.find(l => {
          if (!l.app_time_in) return false;
          const lDate = getManilaDateString(new Date(l.app_time_in));
          return lDate === dateStr;
        });

        // Matching Approved Leave on this date
        const leave = empLeaves.find(lv => {
          return lv.start_date <= dateStr && lv.end_date >= dateStr;
        });

        // Matching DTR correction on this date
        const correction = empCorrections.find(c => c.target_date === dateStr);
        const isCorrected = !!correction;
        const correctionDetails = correction ? {
          id: correction.id,
          reason: correction.reason,
          actorRole: correction.actor_role,
          createdAt: correction.created_at
        } : undefined;

        const scheduledStart = sched ? getManilaTimeString(new Date(sched.start_time)) : null;
        const scheduledEnd = sched && sched.end_time ? getManilaTimeString(new Date(sched.end_time)) : null;

        if (log && log.app_time_in) {
          const inDate = new Date(log.app_time_in);
          const outDate = log.app_time_out ? new Date(log.app_time_out) : null;
          const actualTimeIn = getManilaTimeString(inDate);
          const actualTimeOut = outDate ? getManilaTimeString(outDate) : null;

          if (!outDate) {
            // Unclosed punch
            dailyBreakdown.push({
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
              notes: 'Shift currently ongoing or missing clock-out',
              isManualEntry: !!log.is_manual_entry,
              isCorrected,
              correctionDetails,
            });
            return;
          }

          daysWorked += 1;

          // Compute gross & net hours (deduct 1h unpaid meal break if shift > 5h)
          const grossHours = Math.max(0, (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60));
          const netHours = grossHours > 5 ? Math.max(0, grossHours - 1) : grossHours;
          totalHours += netHours;

          // Late Calculation:
          // If scheduled, compare to sched.start_time.
          // Otherwise compare to 09:00 AM Manila time default.
          let expectedStartTimeMs: number;
          if (sched) {
            expectedStartTimeMs = new Date(sched.start_time).getTime();
          } else {
            const defStart = new Date(`${dateStr}T09:00:00+08:00`);
            expectedStartTimeMs = defStart.getTime();
          }

          let dayLateMins = 0;
          if (inDate.getTime() > expectedStartTimeMs) {
            dayLateMins = Math.floor((inDate.getTime() - expectedStartTimeMs) / (1000 * 60));
            if (dayLateMins > 0) {
              lateCount += 1;
              totalLateMinutes += dayLateMins;
            }
          }

          // Overtime & Night Diff:
          const dayNdHours = calculateNightDiffHours(inDate, outDate);
          nightDiffHours += dayNdHours;

          let dayRegOt = 0;
          let daySunHolOt = 0;

          if (isHoliday || isSunday) {
            // Entire work is Sunday / Holiday OT
            daySunHolOt = netHours;
            sunHolidayOtHours += daySunHolOt;
          } else {
            // Regular workday: hours beyond 8 hours count as Reg OT
            if (netHours > 8) {
              dayRegOt = netHours - 8;
              regOtHours += dayRegOt;
            }
          }

          let status: DailyAuditRecord['status'] = 'present';
          if (dayRegOt > 0 || daySunHolOt > 0) {
            status = 'overtime';
          } else if (dayLateMins > 0) {
            status = 'late';
          }

          dailyBreakdown.push({
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
            nightDiffHours: parseFloat(dayNdHours.toFixed(1)),
            isSunday,
            isHoliday,
            holidayName: holiday?.name,
            status,
            isManualEntry: !!log.is_manual_entry,
            isCorrected,
            correctionDetails,
          });

        } else if (leave) {
          approvedLeaves += 1;
          dailyBreakdown.push({
            date: dateStr,
            dayOfWeek,
            timeLogId: null,
            rawTimeIn: null,
            rawTimeOut: null,
            scheduledStart,
            scheduledEnd,
            scheduleClient: sched?.client_name,
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
            holidayName: holiday?.name,
            status: 'approved_leave',
            leaveType: leave.leave_type,
            notes: `Official ${leave.leave_type.toUpperCase()} leave`,
            isManualEntry: false,
            isCorrected,
            correctionDetails,
          });

        } else if (sched) {
          // Employee had a scheduled shift but did not clock in
          absences += 1;
          dailyBreakdown.push({
            date: dateStr,
            dayOfWeek,
            timeLogId: null,
            rawTimeIn: null,
            rawTimeOut: null,
            scheduledStart,
            scheduledEnd,
            scheduleClient: sched.client_name,
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
            holidayName: holiday?.name,
            status: 'absent',
            notes: `Missed scheduled dispatch at ${sched.client_name}`,
            isManualEntry: false,
            isCorrected,
            correctionDetails,
          });

        } else if (isSunday) {
          dailyBreakdown.push({
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
            isSunday: true,
            isHoliday,
            holidayName: holiday?.name,
            status: 'rest_day',
            notes: 'Sunday Rest Day',
            isManualEntry: false,
            isCorrected,
            correctionDetails,
          });

        } else if (isHoliday) {
          dailyBreakdown.push({
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
            isSunday: false,
            isHoliday: true,
            holidayName: holiday.name,
            status: 'holiday',
            notes: `Official Holiday: ${holiday.name}`,
            isManualEntry: false,
            isCorrected,
            correctionDetails,
          });

        } else {
          // Unscheduled weekday without attendance (Standby / Off-Duty)
          dailyBreakdown.push({
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
            isSunday: false,
            isHoliday: false,
            status: 'off_duty',
            notes: 'No dispatch assigned',
            isManualEntry: false,
            isCorrected,
            correctionDetails,
          });
        }
      });

      return {
        id: profile.id,
        name: profile.full_name,
        role: profile.role as 'technician' | 'helper',
        level: profile.technician_level || (profile.role === 'helper' ? 'Helper' : 'Technician'),
        status: profile.employment_status || 'regular',
        base_salary: Number(profile.base_salary || 0),
        branch_id: profile.branch_id,
        daysWorked,
        totalHours: parseFloat(totalHours.toFixed(1)),
        lateCount,
        totalLateMinutes,
        regOtHours: parseFloat(regOtHours.toFixed(1)),
        sunHolidayOtHours: parseFloat(sunHolidayOtHours.toFixed(1)),
        nightDiffHours: parseFloat(nightDiffHours.toFixed(1)),
        absences,
        approvedLeaves,
        dailyBreakdown,
      };
    });

    return {
      success: true,
      periodLabel: `${startDate} to ${endDate}`,
      startDate,
      endDate,
      records: aggregatedSummaries,
    };
  } catch (err: any) {
    console.error('getAuditPayrollRecords error:', err);
    return {
      success: false,
      periodLabel: '',
      startDate,
      endDate,
      records: [],
      error: err.message || 'Failed to aggregate audit payroll records',
    };
  }
}
