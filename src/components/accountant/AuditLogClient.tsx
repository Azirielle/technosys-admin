"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  Download, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  Filter, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Moon, 
  Sun,
  Users,
  Briefcase,
  Edit3,
  History,
  Sparkles,
  Loader2,
  Info,
  Pencil,
  Check,
  Lock,
  Unlock,
  ShieldCheck
} from 'lucide-react';
import { 
  getAuditPayrollRecords, 
  EmployeeAuditSummary, 
  DailyAuditRecord 
} from '@/app/actions/audit';
import { correctTimeLogPunch } from '@/app/actions/audit-corrections';
import { createClient } from '@/lib/supabase/client';
import { 
  getPeriodLockStatus, 
  lockPayrollPeriod, 
  unlockPayrollPeriod, 
  PayrollLockInfo 
} from '@/app/actions/payroll-locks';

function getManila24HourTime(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    let hour = '08';
    let minute = '00';
    for (const p of parts) {
      if (p.type === 'hour') hour = p.value.padStart(2, '0');
      if (p.type === 'minute') minute = p.value.padStart(2, '0');
    }
    if (hour === '24') hour = '00';
    return `${hour}:${minute}`;
  } catch (e) {
    return '08:00';
  }
}

interface KinsenasPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

const KINSENAS_PERIODS: KinsenasPeriod[] = [
  { id: '2026-09-01_2026-09-15', label: 'September 1 - 15, 2026', startDate: '2026-09-01', endDate: '2026-09-15' },
  { id: '2026-08-16_2026-08-31', label: 'August 16 - 31, 2026', startDate: '2026-08-16', endDate: '2026-08-31' },
  { id: '2026-08-01_2026-08-15', label: 'August 1 - 15, 2026', startDate: '2026-08-01', endDate: '2026-08-15' },
  { id: '2026-07-16_2026-07-31', label: 'July 16 - 31, 2026', startDate: '2026-07-16', endDate: '2026-07-31' },
  { id: '2026-07-01_2026-07-15', label: 'July 1 - 15, 2026', startDate: '2026-07-01', endDate: '2026-07-15' },
  { id: '2026-06-16_2026-06-30', label: 'June 16 - 30, 2026', startDate: '2026-06-16', endDate: '2026-06-30' },
  { id: '2026-06-01_2026-06-15', label: 'June 1 - 15, 2026', startDate: '2026-06-01', endDate: '2026-06-15' },
];

export default function AuditLogClient() {
  const [records, setRecords] = useState<EmployeeAuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('2026-08-16_2026-08-31');
  const [roleFilter, setRoleFilter] = useState<'all' | 'technician' | 'helper'>('all');

  // Inspection Modal
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAuditSummary | null>(null);

  // Correction Modal State
  const [editingDay, setEditingDay] = useState<{
    employee: EmployeeAuditSummary;
    day: DailyAuditRecord;
  } | null>(null);
  const [editTimeIn, setEditTimeIn] = useState('08:00');
  const [editTimeOut, setEditTimeOut] = useState('17:00');
  const [isNextDay, setIsNextDay] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // History Inspector State
  const [viewingHistoryTech, setViewingHistoryTech] = useState<{
    employeeId: string;
    employeeName: string;
    targetDate: string;
  } | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Cutoff Lock & Period Finalization State
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [periodLock, setPeriodLock] = useState<PayrollLockInfo | null>(null);
  const [loadingLock, setLoadingLock] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [lockNotes, setLockNotes] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [lockSubmitting, setLockSubmitting] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const currentPeriod = useMemo(() => {
    return KINSENAS_PERIODS.find(p => p.id === selectedPeriodId) || KINSENAS_PERIODS[1];
  }, [selectedPeriodId]);

  const fetchLockStatus = async () => {
    setLoadingLock(true);
    try {
      const res = await getPeriodLockStatus(currentPeriod.startDate, currentPeriod.endDate);
      if (res.success) {
        setPeriodLock(res.lockInfo);
      }
    } catch (err) {
      console.error("Failed to fetch cutoff lock status:", err);
    } finally {
      setLoadingLock(false);
    }
  };

  useEffect(() => {
    fetchLockStatus();
  }, [selectedPeriodId, currentPeriod]);

  useEffect(() => {
    const resolveUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile) {
            setCurrentUserRole(profile.role);
          }
        }
      } catch (err) {
        console.warn("Could not determine user role:", err);
      }
    };
    resolveUser();

    const supabase = createClient();
    const channel = supabase
      .channel('public:payroll_cutoff_locks_audit')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payroll_cutoff_locks' },
        () => {
          fetchLockStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLockPeriod = async () => {
    setLockSubmitting(true);
    setLockError(null);
    try {
      const res = await lockPayrollPeriod(
        currentPeriod.id,
        currentPeriod.startDate,
        currentPeriod.endDate,
        lockNotes.trim() || undefined
      );
      if (!res.success) {
        setLockError(res.error || "Failed to lock payroll period.");
        return;
      }
      setToastMessage(`Kinsenas cutoff (${currentPeriod.label}) has been finalized and locked.`);
      setTimeout(() => setToastMessage(null), 5000);
      setIsLockModalOpen(false);
      setLockNotes('');
      await fetchLockStatus();
    } catch (err: any) {
      setLockError(err?.message || "Failed to lock payroll period.");
    } finally {
      setLockSubmitting(false);
    }
  };

  const handleUnlockPeriod = async () => {
    if (unlockReason.trim().length < 10) {
      setLockError("Mandatory CEO override rationale of at least 10 characters required.");
      return;
    }
    setLockSubmitting(true);
    setLockError(null);
    try {
      const res = await unlockPayrollPeriod(currentPeriod.id, unlockReason.trim());
      if (!res.success) {
        setLockError(res.error || "Failed to unlock payroll period.");
        return;
      }
      setToastMessage(`Kinsenas cutoff (${currentPeriod.label}) reopened by CEO override.`);
      setTimeout(() => setToastMessage(null), 5000);
      setIsUnlockModalOpen(false);
      setUnlockReason('');
      await fetchLockStatus();
    } catch (err: any) {
      setLockError(err?.message || "Failed to unlock payroll period.");
    } finally {
      setLockSubmitting(false);
    }
  };

  const openCorrectionModal = (employee: EmployeeAuditSummary, day: DailyAuditRecord) => {
    if (periodLock?.is_locked) {
      setToastMessage("Attendance adjustment prohibited: This pay period has been finalized and locked.");
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setEditingDay({ employee, day });
    setCorrectionError(null);
    setEditReason('');
    setIsNextDay(false);

    if (day.rawTimeIn) {
      setEditTimeIn(getManila24HourTime(new Date(day.rawTimeIn)));
    } else {
      setEditTimeIn('08:00');
    }

    if (day.rawTimeOut) {
      setEditTimeOut(getManila24HourTime(new Date(day.rawTimeOut)));
    } else {
      setEditTimeOut('17:00');
    }
  };

  const openHistoryModal = async (employeeId: string, employeeName: string, targetDate: string) => {
    setViewingHistoryTech({ employeeId, employeeName, targetDate });
    setLoadingHistory(true);
    try {
      const { getTimeLogCorrectionHistory } = await import('@/app/actions/audit-corrections');
      const res = await getTimeLogCorrectionHistory(employeeId, targetDate, targetDate);
      if (res.success) {
        setHistoryRecords(res.records);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const correctionPreview = useMemo(() => {
    if (!editingDay) return null;
    const { day } = editingDay;
    const targetDate = day.date;
    const inDate = new Date(`${targetDate}T${editTimeIn}:00+08:00`);
    let outDate = new Date(`${targetDate}T${editTimeOut}:00+08:00`);
    if (isNextDay) {
      outDate = new Date(new Date(`${targetDate}T12:00:00+08:00`).getTime() + 24 * 3600 * 1000);
      const nextDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(outDate);
      outDate = new Date(`${nextDateStr}T${editTimeOut}:00+08:00`);
    }

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || outDate <= inDate) {
      return null;
    }

    const grossHours = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60);
    const netHours = grossHours > 5 ? Math.max(0, grossHours - 1) : grossHours;

    const defStart = new Date(`${targetDate}T08:00:00+08:00`);
    let lateMins = 0;
    if (inDate.getTime() > defStart.getTime()) {
      lateMins = Math.floor((inDate.getTime() - defStart.getTime()) / (1000 * 60));
    }

    let regOt = 0;
    let sunHolOt = 0;
    if (day.isSunday || day.isHoliday) {
      sunHolOt = netHours;
    } else if (netHours > 8) {
      regOt = netHours - 8;
    }

    return {
      grossHours: grossHours.toFixed(1),
      netHours: netHours.toFixed(1),
      mealBreakDeducted: grossHours > 5,
      lateMins,
      regOt: regOt.toFixed(1),
      sunHolOt: sunHolOt.toFixed(1),
    };
  }, [editingDay, editTimeIn, editTimeOut, isNextDay]);

  const handleSaveCorrection = async () => {
    if (!editingDay) return;
    const trimmed = editReason.trim();
    if (trimmed.length < 10) {
      setCorrectionError("A substantive audit rationale of at least 10 characters is required.");
      return;
    }

    const { employee, day } = editingDay;
    const targetDate = day.date;
    const inIso = `${targetDate}T${editTimeIn}:00+08:00`;
    let outIso = `${targetDate}T${editTimeOut}:00+08:00`;
    if (isNextDay) {
      const nextDate = new Date(new Date(`${targetDate}T12:00:00+08:00`).getTime() + 24 * 3600 * 1000);
      const nextDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(nextDate);
      outIso = `${nextDateStr}T${editTimeOut}:00+08:00`;
    }

    if (new Date(outIso).getTime() <= new Date(inIso).getTime()) {
      setCorrectionError("Clock-out time must be after clock-in time. If the shift crossed midnight, check 'Shift Ends Next Day'.");
      return;
    }

    setSavingCorrection(true);
    setCorrectionError(null);

    try {
      const res = await correctTimeLogPunch({
        timeLogId: day.timeLogId,
        technicianId: employee.id,
        targetDate: targetDate,
        timeIn: inIso,
        timeOut: outIso,
        reason: trimmed
      });

      if (!res.success) {
        setCorrectionError(res.error || "Failed to persist correction.");
        setSavingCorrection(false);
        return;
      }

      setToastMessage(`Attendance punch corrected on ${targetDate} for ${employee.name}. Permanent audit trail recorded.`);
      setTimeout(() => setToastMessage(null), 5000);
      setEditingDay(null);

      // Re-fetch data
      await loadAuditData();

      // Update current inspection modal if open
      const freshRes = await getAuditPayrollRecords(
        currentPeriod.startDate,
        currentPeriod.endDate,
        roleFilter
      );
      if (freshRes.success) {
        const updatedEmp = freshRes.records.find(r => r.id === employee.id);
        if (updatedEmp) setSelectedEmployee(updatedEmp);
      }
    } catch (err: any) {
      setCorrectionError(err?.message || "Unexpected error submitting punch correction.");
    } finally {
      setSavingCorrection(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, [selectedPeriodId, roleFilter]);

  const loadAuditData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getAuditPayrollRecords(
        currentPeriod.startDate,
        currentPeriod.endDate,
        roleFilter
      );
      if (res.success) {
        setRecords(res.records);
      } else {
        setErrorMsg(res.error || 'Failed to aggregate audit payroll records');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Server error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.level?.toLowerCase().includes(search.toLowerCase())
    );
  }, [records, search]);

  // Aggregate Metrics for Top Cards
  const telemetry = useMemo(() => {
    let totCrew = records.length;
    let totDays = 0;
    let totHours = 0;
    let totLates = 0;
    let totLateMins = 0;
    let totRegOt = 0;
    let totSunHolOt = 0;
    let totNd = 0;
    let totAbsences = 0;
    let totLeaves = 0;

    records.forEach(r => {
      totDays += r.daysWorked;
      totHours += r.totalHours;
      totLates += r.lateCount;
      totLateMins += r.totalLateMinutes;
      totRegOt += r.regOtHours;
      totSunHolOt += r.sunHolidayOtHours;
      totNd += r.nightDiffHours;
      totAbsences += r.absences;
      totLeaves += r.approvedLeaves;
    });

    return {
      totCrew,
      totDays,
      totHours: totHours.toFixed(1),
      totLates,
      totLateMins,
      totOt: (totRegOt + totSunHolOt).toFixed(1),
      totRegOt: totRegOt.toFixed(1),
      totSunHolOt: totSunHolOt.toFixed(1),
      totNd: totNd.toFixed(1),
      totAbsences,
      totLeaves
    };
  }, [records]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedPeriodId, roleFilter]);

  // Export to Excel (.xlsx) with Lazy Dynamic Import
  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    
    const data: any[][] = [
      ['TECHNOSYS ADMIN - ACCOUNTANT ATTENDANCE AUDIT LOG'],
      ['Pay Period:', currentPeriod.label],
      ['Date Range:', `${currentPeriod.startDate} to ${currentPeriod.endDate}`],
      ['Generated On:', new Date().toLocaleString()],
      [],
      [
        'Employee Name',
        'Role',
        'Level & Status',
        'Days Worked',
        'Total Hours Worked',
        'Late Incidents',
        'Total Late Minutes',
        'Reg OT (Hrs)',
        'Sun/Hol OT (Hrs)',
        'Night Diff (Hrs)',
        'Unexcused Absences',
        'Approved Leaves'
      ]
    ];

    let totDays = 0, totHours = 0, totLates = 0, totLateMins = 0;
    let totRegOt = 0, totSunOt = 0, totNd = 0, totAbsences = 0, totLeaves = 0;

    filteredRecords.forEach(r => {
      totDays += r.daysWorked;
      totHours += r.totalHours;
      totLates += r.lateCount;
      totLateMins += r.totalLateMinutes;
      totRegOt += r.regOtHours;
      totSunOt += r.sunHolidayOtHours;
      totNd += r.nightDiffHours;
      totAbsences += r.absences;
      totLeaves += r.approvedLeaves;

      data.push([
        r.name,
        r.role.toUpperCase(),
        `${r.level.toUpperCase()} • ${r.status.toUpperCase()}`,
        r.daysWorked,
        r.totalHours,
        r.lateCount,
        r.totalLateMinutes,
        r.regOtHours,
        r.sunHolidayOtHours,
        r.nightDiffHours,
        r.absences,
        r.approvedLeaves
      ]);
    });

    data.push([]);
    data.push([
      'TOTALS',
      '',
      '',
      totDays,
      parseFloat(totHours.toFixed(1)),
      totLates,
      totLateMins,
      parseFloat(totRegOt.toFixed(1)),
      parseFloat(totSunOt.toFixed(1)),
      parseFloat(totNd.toFixed(1)),
      totAbsences,
      totLeaves
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 26 },
      { wch: 14 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log');
    XLSX.writeFile(workbook, `technosys_audit_log_${currentPeriod.id}.xlsx`);
  };

  // Export to CSV with UTF-8 BOM
  const exportToCSV = () => {
    const BOM = "\uFEFF";
    const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const headers = [
      "Employee Name",
      "Role",
      "Level & Status",
      "Days Worked",
      "Total Hours Worked",
      "Late Incidents",
      "Total Late Minutes",
      "Reg OT (Hrs)",
      "Sun/Hol OT (Hrs)",
      "Night Diff (Hrs)",
      "Unexcused Absences",
      "Approved Leaves"
    ];

    let totDays = 0, totHours = 0, totLates = 0, totLateMins = 0;
    let totRegOt = 0, totSunOt = 0, totNd = 0, totAbsences = 0, totLeaves = 0;

    const rows = filteredRecords.map(r => {
      totDays += r.daysWorked;
      totHours += r.totalHours;
      totLates += r.lateCount;
      totLateMins += r.totalLateMinutes;
      totRegOt += r.regOtHours;
      totSunOt += r.sunHolidayOtHours;
      totNd += r.nightDiffHours;
      totAbsences += r.absences;
      totLeaves += r.approvedLeaves;

      return [
        escapeCSV(r.name),
        escapeCSV(r.role.toUpperCase()),
        escapeCSV(`${r.level.toUpperCase()} • ${r.status.toUpperCase()}`),
        r.daysWorked,
        r.totalHours,
        r.lateCount,
        r.totalLateMinutes,
        r.regOtHours,
        r.sunHolidayOtHours,
        r.nightDiffHours,
        r.absences,
        r.approvedLeaves
      ].join(",");
    });

    const metadataRows = [
      escapeCSV("TECHNOSYS ADMIN - ACCOUNTANT ATTENDANCE AUDIT LOG"),
      `${escapeCSV("Pay Period:")},${escapeCSV(currentPeriod.label)}`,
      `${escapeCSV("Date Range:")},${escapeCSV(`${currentPeriod.startDate} to ${currentPeriod.endDate}`)}`,
      `${escapeCSV("Generated On:")},${escapeCSV(new Date().toLocaleString())}`,
      ""
    ];

    const totalsRow = [
      escapeCSV("TOTALS"),
      '""',
      '""',
      totDays,
      totHours.toFixed(1),
      totLates,
      totLateMins,
      totRegOt.toFixed(1),
      totSunOt.toFixed(1),
      totNd.toFixed(1),
      totAbsences,
      totLeaves
    ].join(",");

    const csvContent = BOM + metadataRows.join("\n") + headers.map(escapeCSV).join(",") + "\n" + rows.join("\n") + "\n\n" + totalsRow;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `technosys_audit_log_${currentPeriod.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  Accountant Attendance Audit Log
                  <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase">
                    Live Telemetry
                  </span>
                </h1>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                  Review verified field attendance, late minutes, overtime, and night differentials for operations and time audit.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button 
              onClick={exportToExcel}
              disabled={loading || filteredRecords.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              title="Export formatted Excel spreadsheet (.xlsx)"
            >
              <Download className="w-4 h-4" /> Export Excel (.xlsx)
            </button>
            <button 
              onClick={exportToCSV}
              disabled={loading || filteredRecords.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              title="Export formatted CSV file (.csv)"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col overflow-hidden gap-4">

          {/* 5 KPI Telemetry Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Field Crew</span>
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-gray-900">{telemetry.totCrew}</div>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Technicians & Helpers</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Days Worked</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-indigo-600">{telemetry.totDays} <span className="text-xs font-semibold text-gray-400">days</span></div>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{telemetry.totHours} net work hours</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Tardiness</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600">{telemetry.totLates} <span className="text-xs font-semibold text-gray-400">lates</span></div>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{telemetry.totLateMins} total late minutes</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Overtime</span>
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600">{telemetry.totOt} <span className="text-xs font-semibold text-gray-400">hrs</span></div>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Reg: {telemetry.totRegOt}h • Hol/Sun: {telemetry.totSunHolOt}h</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Night Diff</span>
                <Moon className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-purple-600">{telemetry.totNd} <span className="text-xs font-semibold text-gray-400">hrs</span></div>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Absences: {telemetry.totAbsences} • Leaves: {telemetry.totLeaves}d</p>
            </div>
          </div>
          
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-t-xl border border-gray-200 border-b-0 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search staff by name or level..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Kinsenas Period Selector */}
              <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <select 
                  value={selectedPeriodId}
                  onChange={e => setSelectedPeriodId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  {KINSENAS_PERIODS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <select 
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold text-gray-700 outline-none cursor-pointer"
                >
                  <option value="all">All Field Staff</option>
                  <option value="technician">Technicians Only</option>
                  <option value="helper">Helpers Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Cutoff Lock Status & Action */}
              {periodLock?.is_locked ? (
                <div className="flex items-center gap-2">
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold shadow-2xs" 
                    title={`Locked by ${periodLock.locker_name || 'Finance'} at ${new Date(periodLock.locked_at).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Cutoff Frozen</span>
                  </div>
                  {['ceo', 'super_admin'].includes(currentUserRole || '') ? (
                    <button
                      onClick={() => {
                        setLockError(null);
                        setUnlockReason('');
                        setIsUnlockModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Administrative override to reopen cutoff"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>CEO Unlock</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">(Locked for Payout)</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Audit Open</span>
                  </div>
                  {['accountant', 'ceo', 'super_admin'].includes(currentUserRole || '') && (
                    <button
                      onClick={() => {
                        setLockError(null);
                        setLockNotes('');
                        setIsLockModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Finalize this Kinsenas cutoff to prevent further edits"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Freeze Cutoff</span>
                    </button>
                  )}
                </div>
              )}

              <div className="text-xs font-bold text-gray-500 hidden md:block">
                Active Range: <span className="text-indigo-600 font-mono">{currentPeriod.startDate}</span> to <span className="text-indigo-600 font-mono">{currentPeriod.endDate}</span>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white border border-zinc-200 border-b-0 rounded-b-none overflow-y-scroll flex-1 shadow-2xs [scrollbar-gutter:stable]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                    <th className="px-3.5 py-2.5 sticky left-0 bg-zinc-50 border-r border-zinc-200 min-w-[220px] z-10">Employee / Spec</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200 text-center">Days Worked</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200 text-center">Tardiness</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200 text-center">Reg OT</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200 text-center">Sun/Hol OT</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200 text-center">Night Diff</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200 text-center">Absences</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200 text-center">Leaves</th>
                    <th className="px-3.5 py-2.5 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-zinc-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Clock className="w-5 h-5 animate-spin text-zinc-500" />
                          <span>Computing live Kinsenas attendance & time logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : errorMsg ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-rose-500 font-semibold bg-rose-50/50">
                        <div className="flex items-center justify-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          <span>{errorMsg}</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-zinc-400 font-medium">
                        No field crew or attendance records found for this period.
                      </td>
                    </tr>
                  ) : paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/75 transition-colors">
                      {/* Sticky Employee column */}
                      <td className="px-3.5 py-2 sticky left-0 bg-white border-r border-zinc-200 z-10">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            r.role === 'helper' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {r.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 leading-tight truncate">{r.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                r.role === 'helper' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {r.role}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-medium uppercase truncate">
                                {r.level} &bull; {r.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Days Worked */}
                      <td className="px-3 py-2 border-r border-zinc-200 text-center whitespace-nowrap">
                        <span className="font-bold text-zinc-900 text-xs">{r.daysWorked}</span>
                        <span className="text-[10px] text-zinc-400 ml-1 font-mono">({r.totalHours}h)</span>
                      </td>

                      {/* Tardiness */}
                      <td className="px-3 py-2 border-r border-zinc-200 text-center whitespace-nowrap">
                        {r.lateCount > 0 ? (
                          <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                            {r.lateCount} ({r.totalLateMinutes}m)
                          </span>
                        ) : (
                          <span className="font-mono text-zinc-300 text-xs">0</span>
                        )}
                      </td>

                      {/* Regular OT */}
                      <td className="px-3 py-2 border-r border-zinc-200 text-center whitespace-nowrap">
                        {r.regOtHours > 0 ? (
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                            {r.regOtHours}h
                          </span>
                        ) : (
                          <span className="font-mono text-zinc-300 text-xs">0.0</span>
                        )}
                      </td>

                      {/* Sun/Holiday OT */}
                      <td className="px-3 py-2 border-r border-zinc-200 text-center whitespace-nowrap">
                        {r.sunHolidayOtHours > 0 ? (
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded text-[11px]">
                            {r.sunHolidayOtHours}h
                          </span>
                        ) : (
                          <span className="font-mono text-zinc-300 text-xs">0.0</span>
                        )}
                      </td>

                      {/* Night Diff */}
                      <td className="px-3 py-2 border-r border-zinc-200 text-center whitespace-nowrap">
                        {r.nightDiffHours > 0 ? (
                          <span className="font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded text-[11px]">
                            {r.nightDiffHours}h
                          </span>
                        ) : (
                          <span className="font-mono text-zinc-300 text-xs">0.0</span>
                        )}
                      </td>

                      {/* Absences */}
                      <td className="px-3 py-2 border-r border-zinc-200 text-center whitespace-nowrap">
                        {r.absences > 0 ? (
                          <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[11px]">
                            {r.absences}
                          </span>
                        ) : (
                          <span className="font-mono text-zinc-300 text-xs">0</span>
                        )}
                      </td>

                      {/* Approved Leaves */}
                      <td className="px-3 py-2 border-r border-zinc-200 text-center whitespace-nowrap">
                        {r.approvedLeaves > 0 ? (
                          <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[11px]">
                            {r.approvedLeaves}d
                          </span>
                        ) : (
                          <span className="font-mono text-zinc-300 text-xs">0</span>
                        )}
                      </td>

                      {/* Action Button: Inspect DTR */}
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedEmployee(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300/80 rounded-lg transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Inspect DTR</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Pagination Bar */}
          <div className="bg-white px-4 py-2.5 border border-zinc-200 rounded-b-xl flex items-center justify-between shrink-0 shadow-2xs">
            <p className="text-xs font-semibold text-zinc-600">
              Showing <span className="font-bold text-zinc-900">{filteredRecords.length === 0 ? 0 : Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredRecords.length)}</span> to <span className="font-bold text-zinc-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)}</span> of <span className="font-bold text-zinc-900">{filteredRecords.length}</span> staff
            </p>
            <nav className="inline-flex rounded-lg shadow-2xs overflow-hidden border border-zinc-300">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 text-xs font-semibold transition-colors border-r border-zinc-300"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 text-xs font-semibold border-r last:border-r-0 border-zinc-300 transition-colors ${
                    currentPage === i + 1 ? 'bg-zinc-900 text-white font-bold' : 'bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 text-xs font-semibold transition-colors"
              >
                Next
              </button>
            </nav>
          </div>

        </div>
      </div>

      {/* 15-Day Kinsenas DTR Inspection Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white shrink-0">
                  {selectedEmployee.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight">{selectedEmployee.name}</h2>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      selectedEmployee.role === 'helper' ? 'bg-amber-400 text-zinc-900' : 'bg-indigo-400 text-zinc-900'
                    }`}>
                      {selectedEmployee.role}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5">
                    {selectedEmployee.level || 'Technician'} &bull; {selectedEmployee.status.toUpperCase()} &bull; Field Operations
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-[11px] font-semibold text-zinc-400">Period</div>
                  <div className="text-xs font-bold text-indigo-400">{currentPeriod.label}</div>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Mini Telemetry Bar */}
            <div className="px-6 py-2.5 bg-zinc-50 border-b border-zinc-200 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs shrink-0">
              <div className="bg-white p-2 rounded-lg border border-zinc-200 shadow-2xs">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Days Worked</span>
                <span className="font-bold text-zinc-900 text-sm">{selectedEmployee.daysWorked} <span className="text-xs font-normal text-zinc-500">({selectedEmployee.totalHours}h)</span></span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-200 shadow-2xs">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Tardiness</span>
                <span className="font-bold text-amber-600 text-sm">{selectedEmployee.lateCount} <span className="text-xs font-normal text-zinc-500">({selectedEmployee.totalLateMinutes}m)</span></span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-200 shadow-2xs">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Reg OT</span>
                <span className="font-bold text-emerald-600 text-sm">{selectedEmployee.regOtHours}h</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-200 shadow-2xs">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Sun/Hol OT</span>
                <span className="font-bold text-emerald-700 text-sm">{selectedEmployee.sunHolidayOtHours}h</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-200 shadow-2xs">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Night Diff</span>
                <span className="font-bold text-purple-600 text-sm">{selectedEmployee.nightDiffHours}h</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-200 shadow-2xs">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Absences / Leaves</span>
                <span className="font-bold text-red-600 text-sm">{selectedEmployee.absences} <span className="text-xs font-bold text-blue-600">/ {selectedEmployee.approvedLeaves}d</span></span>
              </div>
            </div>

            {/* Cutoff Frozen Notification Banner */}
            {periodLock?.is_locked && (
              <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-200 flex items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Cutoff Frozen: This pay period has been finalized for payroll. Punch edits and manual attendance adjustments are locked.</span>
                </div>
                <span className="text-[11px] text-amber-800 font-medium shrink-0">
                  Locked by {periodLock.locker_name || 'Finance'}
                </span>
              </div>
            )}

            {/* Daily Chronological Breakdown Table */}
            <div className="flex-1 overflow-y-auto p-5 [scrollbar-gutter:stable]">
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="border-r border-zinc-200 px-3 py-2 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider w-[10%]">Date</th>
                      <th className="border-r border-zinc-200 px-3 py-2 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider w-[11%]">Scheduled Shift</th>
                      <th className="border-r border-zinc-200 px-3 py-2 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider w-[13%]">Dispatch Site</th>
                      <th className="border-r border-zinc-200 px-3 py-2 text-[11px] font-bold text-indigo-600 uppercase tracking-wider text-center w-[17%]">Actual In / Out</th>
                      <th className="border-r border-zinc-200 px-2 py-2 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider text-center w-[6%]">Hours</th>
                      <th className="border-r border-zinc-200 px-2 py-2 text-[11px] font-semibold text-amber-600 uppercase tracking-wider text-center w-[6%]">Late</th>
                      <th className="border-r border-zinc-200 px-2 py-2 text-[11px] font-semibold text-emerald-600 uppercase tracking-wider text-center w-[6%]">Reg OT</th>
                      <th className="border-r border-zinc-200 px-2 py-2 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider text-center w-[6%]">Sun/Hol</th>
                      <th className="border-r border-zinc-200 px-2 py-2 text-[11px] font-semibold text-purple-600 uppercase tracking-wider text-center w-[5%]">ND</th>
                      <th className="border-r border-zinc-200 px-3 py-2 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider w-[12%]">Daily Status</th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider text-right w-[8%]">Audit Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {selectedEmployee.dailyBreakdown.map((day) => (
                      <tr key={day.date} className="hover:bg-zinc-50/70 transition-colors">
                        {/* Date */}
                        <td className="border-r border-zinc-200 px-3 py-2 overflow-hidden truncate">
                          <span className="font-semibold text-zinc-900">{day.date}</span>
                          <span className={`ml-1.5 text-[10px] font-bold ${day.isSunday ? 'text-rose-500' : 'text-zinc-400'}`}>
                            ({day.dayOfWeek})
                          </span>
                        </td>

                        {/* Scheduled Shift */}
                        <td className="border-r border-zinc-200 px-3 py-2 text-zinc-600 font-medium overflow-hidden truncate">
                          {day.scheduledStart ? (
                            <span>{day.scheduledStart} - {day.scheduledEnd || '17:00'}</span>
                          ) : (
                            <span className="text-zinc-400 italic">Unscheduled</span>
                          )}
                        </td>

                        {/* Dispatch Site */}
                        <td className="border-r border-zinc-200 px-3 py-2 text-zinc-700 overflow-hidden truncate">
                          {day.scheduleClient ? (
                            <span className="font-medium text-zinc-800" title={day.scheduleClient}>{day.scheduleClient}</span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>

                        {/* Actual In / Out - Center Aligned */}
                        <td className="border-r border-zinc-200 px-3 py-2 text-center whitespace-nowrap">
                          {day.actualTimeIn ? (
                            <div className="font-mono font-bold text-zinc-900 flex items-center justify-center gap-1.5">
                              <span>{day.actualTimeIn}</span>
                              <span className="text-zinc-400 font-normal">&rarr;</span>
                              <span>{day.actualTimeOut || 'Open'}</span>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <span className="text-zinc-300 font-mono">-</span>
                            </div>
                          )}
                        </td>

                        {/* Hours */}
                        <td className="border-r border-zinc-200 px-2 py-2 text-center font-mono font-bold text-zinc-800">
                          {day.hoursWorked > 0 ? `${day.hoursWorked}h` : '-'}
                        </td>

                        {/* Late Mins */}
                        <td className="border-r border-zinc-200 px-2 py-2 text-center">
                          {day.lateMinutes > 0 ? (
                            <span className="font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
                              {day.lateMinutes}m
                            </span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>

                        {/* Reg OT */}
                        <td className="border-r border-zinc-200 px-2 py-2 text-center font-mono">
                          {day.regOtHours > 0 ? (
                            <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">
                              {day.regOtHours}h
                            </span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>

                        {/* Sun/Hol OT */}
                        <td className="border-r border-zinc-200 px-2 py-2 text-center font-mono">
                          {day.sunHolidayOtHours > 0 ? (
                            <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[11px] border border-emerald-300">
                              {day.sunHolidayOtHours}h
                            </span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>

                        {/* Night Diff */}
                        <td className="border-r border-zinc-200 px-2 py-2 text-center font-mono">
                          {day.nightDiffHours > 0 ? (
                            <span className="font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px] border border-purple-200">
                              {day.nightDiffHours}h
                            </span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>

                        {/* Daily Status Badge */}
                        <td className="border-r border-zinc-200 px-3 py-2 overflow-hidden">
                          <div className="flex items-center gap-1 flex-wrap">
                            {day.status === 'present' && (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present
                              </span>
                            )}
                            {day.status === 'late' && (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Late ({day.lateMinutes}m)
                              </span>
                            )}
                            {day.status === 'overtime' && (
                              <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                                <Clock className="w-3 h-3 text-indigo-600" /> Overtime
                              </span>
                            )}
                            {day.status === 'absent' && (
                              <span className="inline-flex items-center gap-1 font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px]" title={day.notes}>
                                <ShieldAlert className="w-3 h-3 text-red-600" /> Missed
                              </span>
                            )}
                            {day.status === 'approved_leave' && (
                              <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">
                                <Briefcase className="w-3 h-3 text-blue-600" /> Leave ({day.leaveType})
                              </span>
                            )}
                            {day.status === 'rest_day' && (
                              <span className="font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-[10px]">
                                Rest Day
                              </span>
                            )}
                            {day.status === 'holiday' && (
                              <span className="font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded text-[10px]" title={day.holidayName || ''}>
                                Holiday
                              </span>
                            )}
                            {day.status === 'off_duty' && (
                              <span className="font-medium text-zinc-400 text-[10px]">
                                Standby
                              </span>
                            )}
                            {day.status === 'unclosed' && (
                              <span className="font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
                                Incomplete
                              </span>
                            )}

                            {day.isCorrected && (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1 py-0.5 rounded text-[9px]" title={day.correctionDetails?.reason}>
                                <History className="w-2.5 h-2.5 text-amber-600" />
                                Audited
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Audit Action Buttons */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {day.isCorrected && (
                              <button
                                onClick={() => openHistoryModal(selectedEmployee.id, selectedEmployee.name, day.date)}
                                title="Inspect compliance audit trail for this date"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                              >
                                <History className="w-3 h-3 text-amber-600" />
                                Trail
                              </button>
                            )}
                            <button
                              disabled={periodLock?.is_locked}
                              onClick={() => openCorrectionModal(selectedEmployee, day)}
                              title={periodLock?.is_locked ? "This Kinsenas period is finalized and locked. CEO override required to edit." : undefined}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors shadow-2xs ${
                                periodLock?.is_locked
                                  ? "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-60"
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer"
                              }`}
                            >
                              <Edit3 className="w-3 h-3" />
                              {day.actualTimeIn ? 'Correct' : 'Add Shift'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                Done Auditing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-emerald-700 flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Punch Correction Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-[60] bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-zinc-200 flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">DTR Punch Correction</h3>
                  <p className="text-[11px] text-zinc-300">{editingDay.employee.name} &bull; {editingDay.day.date} ({editingDay.day.dayOfWeek})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDay(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              {/* Compliance Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">DOLE Audit Requirement:</span> All punch modifications are permanently logged into the compliance register under your administrator credentials. Raw punch history is preserved.
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Time In (PST / UTC+8)</label>
                  <input
                    type="time"
                    value={editTimeIn}
                    onChange={(e) => setEditTimeIn(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Time Out (PST / UTC+8)</label>
                  <input
                    type="time"
                    value={editTimeOut}
                    onChange={(e) => setEditTimeOut(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Next Day Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isNextDay"
                  checked={isNextDay}
                  onChange={(e) => setIsNextDay(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isNextDay" className="text-zinc-700 font-medium cursor-pointer">
                  Shift crosses midnight (Clock-out occurs on the following day)
                </label>
              </div>

              {/* Real-time Math Preview Card */}
              {correctionPreview ? (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Live DOLE Kinsenas Math Preview
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-zinc-200">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Net Hours</span>
                      <span className="font-bold text-zinc-900 text-xs">{correctionPreview.netHours}h</span>
                      {correctionPreview.mealBreakDeducted && (
                        <span className="text-[9px] text-zinc-400 block">-1h meal break</span>
                      )}
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-zinc-200">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Late</span>
                      <span className={`font-bold text-xs ${correctionPreview.lateMins > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>
                        {correctionPreview.lateMins}m
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-zinc-200">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Reg OT</span>
                      <span className={`font-bold text-xs ${Number(correctionPreview.regOt) > 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {correctionPreview.regOt}h
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-zinc-200">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Sun/Hol OT</span>
                      <span className={`font-bold text-xs ${Number(correctionPreview.sunHolOt) > 0 ? 'text-emerald-700' : 'text-zinc-400'}`}>
                        {correctionPreview.sunHolOt}h
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs font-semibold">
                  Invalid shift range: Clock-out must be after clock-in.
                </div>
              )}

              {/* Mandatory Rationale */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-zinc-700">Audit Rationale & Rationale Notes *</label>
                  <span className={`text-[10px] font-mono ${editReason.trim().length >= 10 ? 'text-emerald-600 font-bold' : 'text-zinc-400'}`}>
                    {editReason.trim().length} / 10 characters minimum
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g., Technician completed off-grid field emergency at Makati Med; device battery depleted during sign-off. Verified with coordinator dispatch log."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {correctionError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{correctionError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                disabled={savingCorrection}
                className="px-3.5 py-2 border border-zinc-200 rounded-lg text-zinc-700 font-semibold hover:bg-zinc-100 disabled:opacity-50 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={savingCorrection || editReason.trim().length < 10 || !correctionPreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
              >
                {savingCorrection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Audit...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Auditable Correction
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Inspector Modal */}
      {viewingHistoryTech && (
        <div className="fixed inset-0 z-[70] bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-zinc-200 flex flex-col">
            <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Audit Correction Trail</h3>
              </div>
              <button
                onClick={() => setViewingHistoryTech(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh] text-xs">
              <div className="text-[11px] text-gray-500 font-medium">
                {viewingHistoryTech.employeeName} &bull; {viewingHistoryTech.targetDate}
              </div>
              {loadingHistory ? (
                <div className="p-8 text-center text-gray-400">Loading audit history...</div>
              ) : historyRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No correction history found for this date.</div>
              ) : (
                historyRecords.map((h) => (
                  <div key={h.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-gray-800">{h.actor_name} ({h.actor_role.toUpperCase()})</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(h.created_at).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}
                      </span>
                    </div>
                    <div className="text-gray-700 font-mono text-[11px] bg-white p-2 rounded border border-gray-200">
                      {h.original_time_in ? (
                        <div>
                          <span className="text-gray-400">Original:</span> {new Date(h.original_time_in).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} &rarr; {h.original_time_out ? new Date(h.original_time_out).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }) : 'Open'}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">Original: No mobile punch recorded</div>
                      )}
                      <div className="text-indigo-700 font-bold">
                        <span className="text-gray-400 font-normal">Corrected:</span> {new Date(h.corrected_time_in).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(h.corrected_time_out).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-gray-600 text-[11px] italic bg-amber-50/50 p-2 rounded border border-amber-100">
                      "{h.reason}"
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingHistoryTech(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cutoff Lock Confirmation Modal */}
      {isLockModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Finalize & Freeze Kinsenas Cutoff</h3>
              </div>
              <button
                onClick={() => setIsLockModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Locking Period: {currentPeriod.label}
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  Finalizing will freeze all technician attendance records and DTR adjustments between <strong>{currentPeriod.startDate}</strong> and <strong>{currentPeriod.endDate}</strong>. Modifications will be blocked to ensure DOLE compliance and bank payroll alignment.
                </p>
              </div>

              {lockError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{lockError}</span>
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Cutoff Memo / Audit Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Verified against dispatch field sheets for payout"
                  value={lockNotes}
                  onChange={(e) => setLockNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLockModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLockPeriod}
                disabled={lockSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
              >
                {lockSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Locking Cutoff...
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Confirm & Lock Cutoff
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CEO Administrative Override Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
            <div className="px-5 py-3.5 bg-rose-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">CEO Administrative Override</h3>
              </div>
              <button
                onClick={() => setIsUnlockModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  DOLE Compliance Warning
                </div>
                <p className="text-[11px] leading-relaxed text-rose-700">
                  Reopening <strong>{currentPeriod.label}</strong> allows post-disbursement time log tampering. This action is permanently recorded with your CEO credentials in the audit trail.
                </p>
              </div>

              {lockError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{lockError}</span>
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Mandatory CEO Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this finalized pay period must be reopened (minimum 10 characters)..."
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] mt-1 font-semibold">
                  <span className={unlockReason.trim().length >= 10 ? "text-emerald-600" : "text-amber-600"}>
                    {unlockReason.trim().length >= 10 ? "Requirement satisfied" : `Minimum 10 characters required (${unlockReason.trim().length}/10)`}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnlockPeriod}
                disabled={lockSubmitting || unlockReason.trim().length < 10}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
              >
                {lockSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authorizing Override...
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    Authorize & Reopen Period
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
