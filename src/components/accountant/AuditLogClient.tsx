"use client";

import { useState, useEffect } from 'react';
import { Calendar, Search, Download, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

  const exportToCSV = () => {
    // Generate CSV string
    const headers = ["Name", "Level", "Status", "Base Salary", "Days Worked", "Absences", "Lates", "Reg OT (Hrs)", "Sun/Hol OT (Hrs)", "Night Diff (Hrs)"];
    
    // Use proper CSV escaping (wrapping in quotes) to prevent commas in names from breaking columns
    const escapeCSV = (val: any) => `"${String(val).replace(/"/g, '""')}"`;

    const rows = filteredRecords.map(r => [
      escapeCSV(r.name), 
      escapeCSV(r.level), 
      escapeCSV(r.status), 
      r.base_salary, 
      r.daysWorked, 
      r.absences, 
      r.lates, 
      r.regOtHours, 
      r.sunHolidayOtHours, 
      r.nightDiffHours
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `technosys_audit_log_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
        <div className="flex justify-between items-start max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              Accountant Audit Log
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Review 15-day (Kinsenas) raw attendance records for payroll exporting. No financial calculations are performed here.
            </p>
          </div>
          
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export to Excel / CSV
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          
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
