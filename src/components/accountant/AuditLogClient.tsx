"use client";

import { useState, useEffect } from 'react';
import { Calendar, Search, Download, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import * as XLSX from 'xlsx';

export default function AuditLogClient() {
  const supabase = createClient();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [period, setPeriod] = useState('aug_1_15'); // mocked period selector

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    fetchAuditData();
  }, [period]);

  const fetchAuditData = async () => {
    setLoading(true);
    
    // 1. Fetch Profiles (ONLY technicians)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .order('full_name');
    
    // 2. Fetch Time Logs (in a real app, this would filter by the selected Kinsenas period)
    const { data: timeLogs } = await supabase.from('time_logs').select('*');

    if (profiles) {
      // 3. Aggregate Time Logs per Profile
      const aggregated = profiles.map(profile => {
        const myLogs = (timeLogs || []).filter(log => log.technician_id === profile.id && log.app_time_in && log.app_time_out);
        
        let daysWorked = myLogs.length;
        let lates = 0;
        let regOtHours = 0;
        let nightDiffHours = 0;
        let sunHolidayOtHours = 0; // Mocked logic: randomly assign some if they worked weekends

        myLogs.forEach(log => {
          const inTime = new Date(log.app_time_in);
          const outTime = new Date(log.app_time_out);
          
          // Check Lates (Assuming 9:00 AM start time)
          if (inTime.getHours() >= 9 && inTime.getMinutes() > 0) {
            lates += 1;
          }

          // Check Overtime (Assuming 17:00 / 5:00 PM end time)
          if (outTime.getHours() >= 17) {
            const otMins = ((outTime.getTime() - new Date(outTime).setHours(17,0,0,0)) / 1000) / 60;
            const hours = otMins / 60;
            
            // If they worked past 10 PM (22:00), calculate Night Diff
            if (outTime.getHours() >= 22) {
               const ndMins = ((outTime.getTime() - new Date(outTime).setHours(22,0,0,0)) / 1000) / 60;
               nightDiffHours += (ndMins / 60);
               regOtHours += (hours - (ndMins / 60)); // remaining is Reg OT
            } else {
               regOtHours += hours;
            }
          }

          // Random mock for Sunday OT just to populate the column
          if (inTime.getDay() === 0) {
            const hoursWorked = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
            sunHolidayOtHours += hoursWorked;
          }
        });

        // 4. Return formatted row for the Accountant
        return {
          id: profile.id,
          name: profile.full_name,
          level: profile.technician_level || 'technician',
          status: profile.employment_status || 'regular',
          base_salary: profile.base_salary || 0,
          daysWorked,
          lates,
          regOtHours: regOtHours.toFixed(1),
          nightDiffHours: nightDiffHours.toFixed(1),
          sunHolidayOtHours: sunHolidayOtHours.toFixed(1),
          absences: 15 - daysWorked // assuming 15 working days in Kinsenas
        };
      });

      setRecords(aggregated);
    }
    setLoading(false);
  };

  const filteredRecords = records.filter(r => 
    r.name?.toLowerCase().includes(search.toLowerCase())
  );

  // PAGINATION
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1); // Reset page on filter/search change
  }, [search]);

  const exportToExcel = () => {
    const periodLabel = period === 'aug_1_15' ? 'August 1 - 15, 2026' : 'July 16 - 31, 2026';
    
    // Header & metadata block
    const data: any[][] = [
      ['TECHNOSYS ADMIN - ACCOUNTANT AUDIT LOG'],
      ['Pay Period:', periodLabel],
      ['Generated On:', new Date().toLocaleString()],
      [],
      [
        'Employee Name',
        'Level & Status',
        'Base Salary',
        'Days Worked',
        'Lates',
        'Reg OT (Hrs)',
        'Sun/Hol OT (Hrs)',
        'Night Diff (Hrs)',
        'Absences'
      ]
    ];

    let totDays = 0, totLates = 0, totRegOt = 0, totSunOt = 0, totNightDiff = 0, totAbsences = 0;

    filteredRecords.forEach(r => {
      const regOt = parseFloat(r.regOtHours) || 0;
      const sunOt = parseFloat(r.sunHolidayOtHours) || 0;
      const nd = parseFloat(r.nightDiffHours) || 0;

      totDays += (r.daysWorked || 0);
      totLates += (r.lates || 0);
      totRegOt += regOt;
      totSunOt += sunOt;
      totNightDiff += nd;
      totAbsences += (r.absences || 0);

      data.push([
        r.name,
        `${(r.level || 'TECHNICIAN').toUpperCase()} • ${(r.status || 'REGULAR').toUpperCase()}`,
        `₱${(r.base_salary || 0).toLocaleString()}/day`,
        r.daysWorked || 0,
        r.lates || 0,
        regOt,
        sunOt,
        nd,
        r.absences || 0
      ]);
    });

    data.push([]);
    data.push([
      'TOTALS',
      '',
      '',
      totDays,
      totLates,
      parseFloat(totRegOt.toFixed(1)),
      parseFloat(totSunOt.toFixed(1)),
      parseFloat(totNightDiff.toFixed(1)),
      totAbsences
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 26 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log');
    XLSX.writeFile(workbook, `technosys_audit_log_${period}.xlsx`);
  };

  const exportToCSV = () => {
    const periodLabel = period === 'aug_1_15' ? 'August 1 - 15, 2026' : 'July 16 - 31, 2026';
    const BOM = "\uFEFF"; // UTF-8 Byte Order Mark for Excel compatibility
    const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const headers = [
      "Employee Name",
      "Level & Status",
      "Base Salary",
      "Days Worked",
      "Lates",
      "Reg OT (Hrs)",
      "Sun/Hol OT (Hrs)",
      "Night Diff (Hrs)",
      "Absences"
    ];

    let totDays = 0, totLates = 0, totRegOt = 0, totSunOt = 0, totNightDiff = 0, totAbsences = 0;

    const rows = filteredRecords.map(r => {
      const regOt = parseFloat(r.regOtHours) || 0;
      const sunOt = parseFloat(r.sunHolidayOtHours) || 0;
      const nd = parseFloat(r.nightDiffHours) || 0;

      totDays += (r.daysWorked || 0);
      totLates += (r.lates || 0);
      totRegOt += regOt;
      totSunOt += sunOt;
      totNightDiff += nd;
      totAbsences += (r.absences || 0);

      return [
        escapeCSV(r.name),
        escapeCSV(`${(r.level || 'TECHNICIAN').toUpperCase()} • ${(r.status || 'REGULAR').toUpperCase()}`),
        escapeCSV(`₱${(r.base_salary || 0).toLocaleString()}/day`),
        r.daysWorked || 0,
        r.lates || 0,
        regOt.toFixed(1),
        sunOt.toFixed(1),
        nd.toFixed(1),
        r.absences || 0
      ].join(",");
    });

    const metadataRows = [
      escapeCSV("TECHNOSYS ADMIN - ACCOUNTANT AUDIT LOG"),
      `${escapeCSV("Pay Period:")},${escapeCSV(periodLabel)}`,
      `${escapeCSV("Generated On:")},${escapeCSV(new Date().toLocaleString())}`,
      ""
    ];

    const totalsRow = [
      escapeCSV("TOTALS"),
      '""',
      '""',
      totDays,
      totLates,
      totRegOt.toFixed(1),
      totSunOt.toFixed(1),
      totNightDiff.toFixed(1),
      totAbsences
    ].join(",");

    const csvContent = BOM + metadataRows.join("\n") + headers.map(escapeCSV).join(",") + "\n" + rows.join("\n") + "\n\n" + totalsRow;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `technosys_audit_log_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Accountant Audit Log
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Review 15-day (Kinsenas) raw attendance records for payroll exporting. No financial calculations are performed here.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              title="Export formatted Excel spreadsheet (.xlsx)"
            >
              <Download className="w-4 h-4" /> Export to Excel (.xlsx)
            </button>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              title="Export formatted CSV file (.csv)"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
          
          {/* Controls */}
          <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search technician..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              
              <select 
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="border border-gray-200 rounded-lg py-2 px-4 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="aug_1_15">August 1 - 15, 2026</option>
                <option value="jul_16_31">July 16 - 31, 2026</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm font-bold text-gray-500">
                {filteredRecords.length} Records found
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-gray-700 px-2">
                  PAGE {currentPage} / {totalPages}
                </span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[240px]">Employee</th>
                    <th className="px-3 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Base Salary</th>
                    <th className="px-3 py-3.5 text-xs font-black text-indigo-600 uppercase tracking-wider border-l border-gray-200 bg-indigo-50/30 text-center">Days Worked</th>
                    <th className="px-3 py-3.5 text-xs font-black text-amber-600 uppercase tracking-wider text-center">Lates</th>
                    <th className="px-3 py-3.5 text-xs font-black text-emerald-600 uppercase tracking-wider border-l border-gray-200 bg-emerald-50/30 text-center">Reg OT (Hrs)</th>
                    <th className="px-3 py-3.5 text-xs font-black text-emerald-600 uppercase tracking-wider bg-emerald-50/30 text-center">Sun/Hol OT (Hrs)</th>
                    <th className="px-3 py-3.5 text-xs font-black text-emerald-600 uppercase tracking-wider bg-emerald-50/30 border-r border-gray-200 text-center">Night Diff (Hrs)</th>
                    <th className="px-3 py-3.5 text-xs font-black text-red-600 uppercase tracking-wider text-center">Absences</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400 font-medium">Computing time logs...</td></tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400 font-medium">No records found.</td></tr>
                  ) : paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-5 py-3.5 sticky left-0 bg-white border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="font-bold text-gray-900">{r.name}</div>
                        <div className="text-[10px] font-black uppercase text-gray-500 mt-0.5">{r.level} &bull; {r.status}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="font-mono font-bold text-sm text-gray-600">
                          ₱{r.base_salary?.toLocaleString()}/day
                        </span>
                      </td>
                      <td className="px-3 py-3.5 border-l border-gray-100 bg-indigo-50/10 text-center">
                        <span className="font-bold text-gray-900">{r.daysWorked}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {r.lates > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">{r.lates}</span>
                        ) : (
                          <span className="font-bold text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 border-l border-gray-100 bg-emerald-50/10 text-center">
                        <span className="font-mono font-bold text-gray-700">{r.regOtHours}</span>
                      </td>
                      <td className="px-3 py-3.5 bg-emerald-50/10 text-center">
                        <span className="font-mono font-bold text-gray-700">{r.sunHolidayOtHours}</span>
                      </td>
                      <td className="px-3 py-3.5 border-r border-gray-100 bg-emerald-50/10 text-center">
                        <span className="font-mono font-bold text-gray-700">{r.nightDiffHours}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {r.absences > 0 ? (
                          <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{r.absences}</span>
                        ) : (
                          <span className="font-bold text-gray-300">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
