"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import { getBranchFilter } from "@/lib/branch-filter"
import { WORK_V2, loadWorkV2 } from "@/lib/dtrWorkV2"
import type { DtrJob, DtrResult, EmployeeAuditSummary } from "./types"
import { getDatesInRange, getManilaDateString } from "./timeUtils"
import { evaluateDay } from "./dayRules"
import { buildEmployeeLeaveMap, type ApprovedLeaveRow } from "./leaveCredits"

export async function getDtrRecords(
  startDate: string,
  endDate: string,
  roleFilter: 'all' | 'technician' | 'helper' = 'all'
): Promise<DtrResult> {
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
      .select('id, full_name, role, technician_level, employment_status, branch_id, hire_date')
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
      .from('attendance_logs')
      .select('id, technician_id, app_time_in, app_time_out, total_hours, status, is_manual_entry, is_mocked, gps_accuracy, is_suspicious')
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

    // 4b. Jobs where they are crew (not lead): their start time and absences follow those jobs too.
    const { data: crewRows, error: crewErr } = await supabaseAdmin
      .from('schedule_crew')
      .select('technician_id, schedules!inner(id, technician_id, client_name, location, start_time, end_time, status)')
      .in('technician_id', profileIds)
      .neq('status', 'released')
      .gte('schedules.start_time', utcStart)
      .lte('schedules.start_time', utcEnd)
      .neq('schedules.status', 'cancelled');
    if (crewErr) throw crewErr;
    let allJobs: DtrJob[] = [
      ...((schedules || []) as DtrJob[]),
      ...(crewRows || []).map((r) => ({ ...(r.schedules as unknown as DtrJob), technician_id: r.technician_id })),
    ];
    // Work v2 (after the switch-over): work days and jobs from the new tables, hours from the database
    const v2 = WORK_V2 ? await loadWorkV2(profileIds, startDate, endDate) : null;
    if (v2) allJobs = v2.jobs as unknown as DtrJob[];
    const dtrLogs = v2 ? v2.logs : (timeLogs || []);

    // 4c. Approved overtime (hours past 8 count as overtime only up to these).
    const { data: otRequests, error: otErr } = await supabaseAdmin
      .from('overtime_requests')
      .select('technician_id, request_date, requested_hours')
      .in('technician_id', profileIds)
      .gte('request_date', startDate)
      .lte('request_date', endDate)
      .eq('status', 'approved');
    if (otErr) throw otErr;
    const todayStr = getManilaDateString(new Date());

    // 5. Batch Fetch Holidays
    const { data: holidays, error: holErr } = await supabaseAdmin
      .from('holidays')
      .select('id, name, holiday_date, is_active, holiday_type')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .eq('is_active', true);

    if (holErr) throw holErr;

    // 6. Batch Fetch Approved Leaves from Jan 1 of cut-off's year to cut-off end
    const cutoffYear = parseInt(startDate.slice(0, 4), 10);
    const yearStart = `${cutoffYear}-01-01`;
    const { data: leaves, error: leaveErr } = await supabaseAdmin
      .from('leaves')
      .select('id, technician_id, start_date, end_date, leave_type, status, sick_days')
      .in('technician_id', profileIds)
      .lte('start_date', endDate)
      .gte('end_date', yearStart)
      .eq('status', 'approved');

    if (leaveErr) throw leaveErr;

    // 7. Batch Fetch DTR Corrections in Range
    const { data: corrections } = await supabaseAdmin
      .from('attendance_corrections')
      .select('id, time_log_id, technician_id, target_date, reason, actor_role, created_at')
      .in('technician_id', profileIds)
      .gte('target_date', startDate)
      .lte('target_date', endDate)
      .order('created_at', { ascending: false });

    // Create lookup maps for fast access
    const holidayMap = new Map<string, { name: string; type: string }>();
    (holidays || []).forEach(h => {
      holidayMap.set(h.holiday_date, { name: h.name, type: h.holiday_type });
    });

    const datesList = getDatesInRange(startDate, endDate);

    // 8. Aggregate metrics per employee
    const aggregatedSummaries: EmployeeAuditSummary[] = profiles.map(profile => {
      const empLogs = dtrLogs.filter(l => l.technician_id === profile.id);
      const empScheds = allJobs
        .filter((s, i, all) => s.technician_id === profile.id && all.findIndex((o) => o.id === s.id && o.technician_id === s.technician_id) === i)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const approvedOtOn = (day: string) =>
        (otRequests || []).filter((o) => o.technician_id === profile.id && o.request_date === day).reduce((sum, o) => sum + Number(o.requested_hours || 0), 0);
      const empLeaves = (leaves || []).filter(lv => lv.technician_id === profile.id);
      const empLeaveMap = buildEmployeeLeaveMap(empLeaves as ApprovedLeaveRow[], yearStart, endDate);
      const empCorrections = (corrections || []).filter(c => c.technician_id === profile.id);

      let daysWorked = 0;
      let totalHours = 0;
      let lateCount = 0;
      let totalLateMinutes = 0;
      let regOtHours = 0;
      let sunHolidayOtHours = 0;
      let sundayHours = 0;
      let regularHolidayHours = 0;
      let specialHolidayHours = 0;
      let nightDiffHours = 0;
      let sickLeaveDays = 0;
      let vacationLeaveDays = 0;
      let salaryDeductionDays = 0;
      let otherLeaveDays = 0;
      let absences = 0;
      let approvedLeaves = 0;

      const dailyBreakdown = datesList.map(dateStr => {
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

        // Matching Approved Leave on this date under leave credit rules
        const leaveInfo = empLeaveMap.get(dateStr);
        const leave = leaveInfo ? { leave_type: leaveInfo.leaveType } : undefined;
        const leaveCategory = leaveInfo?.label;

        // Matching DTR correction on this date
        const correction = empCorrections.find(c => c.target_date === dateStr);

        const result = evaluateDay({
          dateStr,
          todayStr,
          profile,
          sched,
          log,
          leave,
          leaveCategory,
          correction,
          holiday: holidayMap.get(dateStr),
          approvedOtHours: approvedOtOn(dateStr),
          isV2: !!v2,
        });

        daysWorked += result.daysWorked;
        totalHours += result.netHours;
        lateCount += result.lateCount;
        totalLateMinutes += result.lateMinutes;
        regOtHours += result.regOtHours;
        sunHolidayOtHours += result.sunHolidayOtHours;
        sundayHours += result.sundayHours;
        regularHolidayHours += result.regularHolidayHours;
        specialHolidayHours += result.specialHolidayHours;
        nightDiffHours += result.nightDiffHours;
        sickLeaveDays += result.sickLeaveDays;
        vacationLeaveDays += result.vacationLeaveDays;
        salaryDeductionDays += result.salaryDeductionDays;
        otherLeaveDays += result.otherLeaveDays;
        absences += result.absences;
        approvedLeaves += result.approvedLeaves;

        return result.record;
      });

      return {
        id: profile.id,
        name: profile.full_name,
        role: profile.role as 'technician' | 'helper',
        level: profile.technician_level || (profile.role === 'helper' ? 'Helper' : 'Technician'),
        status: profile.employment_status || 'regular',
        branch_id: profile.branch_id,
        daysWorked,
        totalHours: parseFloat(totalHours.toFixed(1)),
        lateCount,
        totalLateMinutes,
        regOtHours: parseFloat(regOtHours.toFixed(1)),
        sunHolidayOtHours: parseFloat(sunHolidayOtHours.toFixed(1)),
        sundayHours: parseFloat(sundayHours.toFixed(1)),
        regularHolidayHours: parseFloat(regularHolidayHours.toFixed(1)),
        specialHolidayHours: parseFloat(specialHolidayHours.toFixed(1)),
        nightDiffHours: parseFloat(nightDiffHours.toFixed(1)),
        sickLeaveDays,
        vacationLeaveDays,
        salaryDeductionDays,
        otherLeaveDays,
        absences: salaryDeductionDays,
        approvedLeaves: sickLeaveDays + vacationLeaveDays + otherLeaveDays,
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
    console.error('getDtrRecords error:', err);
    return {
      success: false,
      periodLabel: '',
      startDate,
      endDate,
      records: [],
      error: err.message || 'Failed to load DTR records',
    };
  }
}
