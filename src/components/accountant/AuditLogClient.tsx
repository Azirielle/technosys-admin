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
  Briefcase
} from 'lucide-react';
import { 
  getAuditPayrollRecords, 
  EmployeeAuditSummary, 
  DailyAuditRecord 
} from '@/app/actions/audit';

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const currentPeriod = useMemo(() => {
    return KINSENAS_PERIODS.find(p => p.id === selectedPeriodId) || KINSENAS_PERIODS[1];
  }, [selectedPeriodId]);

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
        'Base Salary (Daily)',
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
        `₱${(r.base_salary || 0).toLocaleString()}/day`,
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
      { wch: 20 },
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
      "Base Salary (Daily)",
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
        escapeCSV(`₱${(r.base_salary || 0).toLocaleString()}/day`),
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
                  Review verified 15-day (Kinsenas) attendance, late minutes, overtime, and night differentials for payroll validation.
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

            <div className="text-xs font-bold text-gray-500">
              Active Range: <span className="text-indigo-600 font-mono">{currentPeriod.startDate}</span> to <span className="text-indigo-600 font-mono">{currentPeriod.endDate}</span>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white border border-gray-200 border-b-0 rounded-b-none overflow-y-scroll flex-1 shadow-xs [scrollbar-gutter:stable]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[240px]">Employee</th>
                    <th className="px-3 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Base Salary</th>
                    <th className="px-3 py-3 text-xs font-black text-indigo-600 uppercase tracking-wider border-l border-gray-200 bg-indigo-50/30 text-center">Days Worked</th>
                    <th className="px-3 py-3 text-xs font-black text-amber-600 uppercase tracking-wider text-center">Tardiness</th>
                    <th className="px-3 py-3 text-xs font-black text-emerald-600 uppercase tracking-wider border-l border-gray-200 bg-emerald-50/30 text-center">Reg OT</th>
                    <th className="px-3 py-3 text-xs font-black text-emerald-600 uppercase tracking-wider bg-emerald-50/30 text-center">Sun/Hol OT</th>
                    <th className="px-3 py-3 text-xs font-black text-purple-600 uppercase tracking-wider bg-purple-50/30 border-r border-gray-200 text-center">Night Diff</th>
                    <th className="px-3 py-3 text-xs font-black text-red-600 uppercase tracking-wider text-center">Absences</th>
                    <th className="px-3 py-3 text-xs font-black text-blue-600 uppercase tracking-wider text-center">Leaves</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-gray-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Clock className="w-6 h-6 animate-spin text-indigo-500" />
                          <span>Computing live Kinsenas attendance & time logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : errorMsg ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-red-500 font-semibold bg-red-50/50">
                        <div className="flex items-center justify-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          <span>{errorMsg}</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-gray-400 font-medium">
                        No field crew or attendance records found for this period.
                      </td>
                    </tr>
                  ) : paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-indigo-50/20 transition-colors">
                      {/* Sticky Employee column */}
                      <td className="px-5 py-3.5 sticky left-0 bg-white border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                            r.role === 'helper' 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}>
                            {r.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{r.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                r.role === 'helper' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {r.role}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase">
                                {r.level} &bull; {r.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td className="px-3 py-3.5">
                        <span className="font-mono font-bold text-xs text-gray-700">
                          ₱{r.base_salary?.toLocaleString()}/day
                        </span>
                      </td>

                      {/* Days Worked */}
                      <td className="px-3 py-3.5 border-l border-gray-100 bg-indigo-50/10 text-center">
                        <span className="font-bold text-gray-900 text-sm">{r.daysWorked}</span>
                        <div className="text-[10px] font-mono text-gray-400">{r.totalHours}h net</div>
                      </td>

                      {/* Tardiness */}
                      <td className="px-3 py-3.5 text-center">
                        {r.lateCount > 0 ? (
                          <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                            {r.lateCount} ({r.totalLateMinutes}m)
                          </span>
                        ) : (
                          <span className="font-bold text-gray-300">0</span>
                        )}
                      </td>

                      {/* Regular OT */}
                      <td className="px-3 py-3.5 border-l border-gray-100 bg-emerald-50/10 text-center">
                        {r.regOtHours > 0 ? (
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                            {r.regOtHours}h
                          </span>
                        ) : (
                          <span className="font-mono text-gray-300">0.0</span>
                        )}
                      </td>

                      {/* Sun/Holiday OT */}
                      <td className="px-3 py-3.5 bg-emerald-50/10 text-center">
                        {r.sunHolidayOtHours > 0 ? (
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                            {r.sunHolidayOtHours}h
                          </span>
                        ) : (
                          <span className="font-mono text-gray-300">0.0</span>
                        )}
                      </td>

                      {/* Night Diff */}
                      <td className="px-3 py-3.5 border-r border-gray-100 bg-purple-50/10 text-center">
                        {r.nightDiffHours > 0 ? (
                          <span className="font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded text-xs">
                            {r.nightDiffHours}h
                          </span>
                        ) : (
                          <span className="font-mono text-gray-300">0.0</span>
                        )}
                      </td>

                      {/* Absences */}
                      <td className="px-3 py-3.5 text-center">
                        {r.absences > 0 ? (
                          <span className="font-bold text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded text-xs">
                            {r.absences}
                          </span>
                        ) : (
                          <span className="font-bold text-gray-300">0</span>
                        )}
                      </td>

                      {/* Approved Leaves */}
                      <td className="px-3 py-3.5 text-center">
                        {r.approvedLeaves > 0 ? (
                          <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded text-xs">
                            {r.approvedLeaves}d
                          </span>
                        ) : (
                          <span className="font-bold text-gray-300">0</span>
                        )}
                      </td>

                      {/* Action Button: Inspect DTR */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedEmployee(r)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-md transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect DTR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Pagination Bar */}
          <div className="bg-white px-4 py-3 border border-gray-200 rounded-b-xl flex items-center justify-between shrink-0 shadow-2xs">
            <p className="text-xs font-semibold text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredRecords.length === 0 ? 0 : Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredRecords.length)}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)}</span> of <span className="font-bold text-gray-900">{filteredRecords.length}</span> staff
            </p>
            <nav className="inline-flex rounded-md shadow-2xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-l-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-xs font-bold transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border-t border-b border-r border-gray-300 text-xs font-bold ${currentPage === i + 1 ? 'bg-indigo-50 text-indigo-600 border-indigo-300 z-10' : 'bg-white text-gray-600 hover:bg-gray-50'} -ml-px transition-colors`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 rounded-r-md border border-gray-300 border-l bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 -ml-px text-xs font-bold transition-colors"
              >
                Next
              </button>
            </nav>
          </div>

        </div>
      </div>

      {/* 15-Day Kinsenas DTR Inspection Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-black text-sm text-white">
                  {selectedEmployee.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight">{selectedEmployee.name}</h2>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      selectedEmployee.role === 'helper' ? 'bg-amber-400 text-slate-900' : 'bg-indigo-400 text-slate-900'
                    }`}>
                      {selectedEmployee.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {selectedEmployee.level} &bull; {selectedEmployee.status.toUpperCase()} &bull; Base: ₱{selectedEmployee.base_salary.toLocaleString()}/day
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-300">Period</div>
                  <div className="text-xs font-black text-indigo-400">{currentPeriod.label}</div>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Mini Telemetry Bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs shrink-0">
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Days Worked</span>
                <span className="font-black text-gray-900 text-sm">{selectedEmployee.daysWorked} <span className="text-xs font-normal text-gray-500">({selectedEmployee.totalHours}h)</span></span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Tardiness</span>
                <span className="font-black text-amber-600 text-sm">{selectedEmployee.lateCount} <span className="text-xs font-normal text-gray-500">({selectedEmployee.totalLateMinutes}m)</span></span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Reg OT</span>
                <span className="font-black text-emerald-600 text-sm">{selectedEmployee.regOtHours}h</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Sun/Hol OT</span>
                <span className="font-black text-emerald-700 text-sm">{selectedEmployee.sunHolidayOtHours}h</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Night Diff</span>
                <span className="font-black text-purple-600 text-sm">{selectedEmployee.nightDiffHours}h</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Absences / Leaves</span>
                <span className="font-black text-red-600 text-sm">{selectedEmployee.absences} <span className="text-xs font-bold text-blue-600">/ {selectedEmployee.approvedLeaves}d</span></span>
              </div>
            </div>

            {/* Daily Chronological Breakdown Table */}
            <div className="flex-1 overflow-y-auto p-6 [scrollbar-gutter:stable]">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 font-black text-gray-600 uppercase">Date</th>
                    <th className="px-3 py-2.5 font-black text-gray-600 uppercase">Scheduled Shift</th>
                    <th className="px-3 py-2.5 font-black text-gray-600 uppercase">Dispatch Site</th>
                    <th className="px-3 py-2.5 font-black text-indigo-600 uppercase">Actual In / Out</th>
                    <th className="px-2 py-2.5 font-black text-gray-600 uppercase text-center">Hours</th>
                    <th className="px-2 py-2.5 font-black text-amber-600 uppercase text-center">Late</th>
                    <th className="px-2 py-2.5 font-black text-emerald-600 uppercase text-center">Reg OT</th>
                    <th className="px-2 py-2.5 font-black text-emerald-700 uppercase text-center">Sun/Hol</th>
                    <th className="px-2 py-2.5 font-black text-purple-600 uppercase text-center">ND</th>
                    <th className="px-3 py-2.5 font-black text-gray-600 uppercase">Daily Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEmployee.dailyBreakdown.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50/80 transition-colors">
                      {/* Date */}
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-gray-900">{day.date}</span>
                        <span className={`ml-1.5 text-[10px] font-bold ${day.isSunday ? 'text-rose-500' : 'text-gray-400'}`}>
                          ({day.dayOfWeek})
                        </span>
                      </td>

                      {/* Scheduled Shift */}
                      <td className="px-3 py-2.5 text-gray-600 font-medium">
                        {day.scheduledStart ? (
                          <span>{day.scheduledStart} - {day.scheduledEnd || '17:00'}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unscheduled</span>
                        )}
                      </td>

                      {/* Dispatch Site */}
                      <td className="px-3 py-2.5 text-gray-700 max-w-[160px] truncate">
                        {day.scheduleClient ? (
                          <span className="font-semibold text-gray-800" title={day.scheduleClient}>{day.scheduleClient}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Actual In / Out */}
                      <td className="px-3 py-2.5">
                        {day.actualTimeIn ? (
                          <div className="font-mono font-bold text-gray-900">
                            {day.actualTimeIn} &rarr; {day.actualTimeOut || 'Open'}
                          </div>
                        ) : (
                          <span className="text-gray-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Hours */}
                      <td className="px-2 py-2.5 text-center font-mono font-bold text-gray-800">
                        {day.hoursWorked > 0 ? `${day.hoursWorked}h` : '-'}
                      </td>

                      {/* Late Mins */}
                      <td className="px-2 py-2.5 text-center">
                        {day.lateMinutes > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            {day.lateMinutes}m
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Reg OT */}
                      <td className="px-2 py-2.5 text-center font-mono">
                        {day.regOtHours > 0 ? (
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {day.regOtHours}h
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Sun/Hol OT */}
                      <td className="px-2 py-2.5 text-center font-mono">
                        {day.sunHolidayOtHours > 0 ? (
                          <span className="font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                            {day.sunHolidayOtHours}h
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Night Diff */}
                      <td className="px-2 py-2.5 text-center font-mono">
                        {day.nightDiffHours > 0 ? (
                          <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {day.nightDiffHours}h
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Daily Status Badge */}
                      <td className="px-3 py-2.5">
                        {day.status === 'present' && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present
                          </span>
                        )}
                        {day.status === 'late' && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Late ({day.lateMinutes}m)
                          </span>
                        )}
                        {day.status === 'overtime' && (
                          <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                            <Clock className="w-3 h-3 text-indigo-600" /> Overtime
                          </span>
                        )}
                        {day.status === 'absent' && (
                          <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px]" title={day.notes}>
                            <ShieldAlert className="w-3 h-3 text-red-600" /> Missed Shift
                          </span>
                        )}
                        {day.status === 'approved_leave' && (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                            <Briefcase className="w-3 h-3 text-blue-600" /> Leave ({day.leaveType})
                          </span>
                        )}
                        {day.status === 'rest_day' && (
                          <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            Rest Day
                          </span>
                        )}
                        {day.status === 'holiday' && (
                          <span className="font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded text-[11px]" title={day.holidayName || ''}>
                            Holiday ({day.holidayName?.slice(0, 14)}...)
                          </span>
                        )}
                        {day.status === 'off_duty' && (
                          <span className="font-semibold text-gray-400 text-[11px]">
                            Standby
                          </span>
                        )}
                        {day.status === 'unclosed' && (
                          <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                            Incomplete Punch
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
              >
                Done Auditing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
