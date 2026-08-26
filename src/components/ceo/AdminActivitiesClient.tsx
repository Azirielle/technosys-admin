'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  User,
  Unlock,
  Lock,
  Clock,
  Info,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import { fetchAdminActivities, formatRelativeTime, formatExactDate, AdminActivityItem } from '@/lib/auditLogger'

export default function AdminActivitiesClient() {
  const [activities, setActivities] = useState<AdminActivityItem[]>([])
  const [activeTab, setActiveTab] = useState<'override' | 'standard'>('override')
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AdminActivityItem | null>(null)
  const [, setTick] = useState(0)

  // Load activities and setup listeners
  useEffect(() => {
    const loadLogs = () => {
      setActivities(fetchAdminActivities())
    }

    loadLogs()

    window.addEventListener('admin_activities_updated', loadLogs)
    window.addEventListener('storage', loadLogs)

    // Interval to update relative timestamps every 30s
    const timer = setInterval(() => {
      setTick(t => t + 1)
    }, 30000)

    return () => {
      window.removeEventListener('admin_activities_updated', loadLogs)
      window.removeEventListener('storage', loadLogs)
      clearInterval(timer)
    }
  }, [])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  // Filter logs based on active tab and search filters
  const filteredLogs = useMemo(() => {
    return activities.filter(log => {
      // Category filter
      if (activeTab === 'override' && !log.isOverride) return false
      if (activeTab === 'standard' && log.isOverride) return false

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchesName = log.adminName.toLowerCase().includes(query)
        const matchesAction = log.action.toLowerCase().includes(query)
        const matchesTarget = log.targetEntity.toLowerCase().includes(query)
        const matchesModule = log.moduleName.toLowerCase().includes(query)
        if (!matchesName && !matchesAction && !matchesTarget && !matchesModule) return false
      }

      // Role filter
      if (selectedRole !== 'all' && log.adminRoleKey !== selectedRole) return false

      // Module filter
      if (selectedModule !== 'all' && log.moduleKey !== selectedModule) return false

      return true
    })
  }, [activities, activeTab, search, selectedRole, selectedModule])

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredLogs, currentPage, ITEMS_PER_PAGE])

  // Count summaries
  const overrideCount = useMemo(() => activities.filter(l => l.isOverride).length, [activities])
  const standardCount = useMemo(() => activities.filter(l => !l.isOverride).length, [activities])

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden p-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-indigo-600" />
            Administrator Activity Audit Logs
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Pinnacle Chief Executive Officer oversight. Track and verify admin activities executed under standard scope vs. CEO-granted overrides.
          </p>
        </div>
      </div>

      {/* Main Filter & Navigation Tabs */}
      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
        {/* Category Tabs Header */}
        <div className="border-b border-gray-200 bg-gray-50/80 px-4 pt-3 flex flex-col shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('override'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'override'
                  ? 'bg-white text-indigo-900 border-indigo-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 border-transparent hover:bg-gray-100'
              }`}
            >
              <Unlock className="w-4 h-4 text-purple-600" />
              <span>CEO Granted Override Activities</span>
              <span className="ml-1 bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {overrideCount}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('standard'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'standard'
                  ? 'bg-white text-gray-900 border-indigo-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 border-transparent hover:bg-gray-100'
              }`}
            >
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Standard Scope Activities</span>
              <span className="ml-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {standardCount}
              </span>
            </button>
          </div>

          {/* Category Explainer Row Directly Under Tabs */}
          <div className="py-2.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-500 border-t border-gray-200/60 mt-1">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              {activeTab === 'override' 
                ? 'Showing actions performed by administrators using features granted by CEO system overrides.'
                : 'Showing actions performed by administrators within their standard job role boundaries.'}
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search admin name, action, or target..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              Role:
            </div>
            <select
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              className="bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="accountant">Accountant</option>
              <option value="coordinator">Field Operations</option>
              <option value="hr">HR Department</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 ml-2">
              Module:
            </div>
            <select
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
              className="bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Modules</option>
              <option value="hr_tickets">Tickets & Leaves</option>
              <option value="hr_files">201 Files</option>
              <option value="accountant_audit">Audit Logs</option>
              <option value="coordinator_dispatch">Dispatch & Scheduling</option>
              <option value="coordinator_tracking">Live Tracking</option>
              <option value="coordinator_inventory">Inventory Management</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-y-scroll flex-1 [scrollbar-gutter:stable]">
          <table className="w-full border-collapse border border-gray-300 table-fixed">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[28%]">
                  Administrator & Role
                </th>
                <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[36%]">
                  Action & Feature Module
                </th>
                <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[18%]">
                  Access Scope
                </th>
                <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[18%]">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-6 py-12 text-center text-gray-500">
                    No admin activities match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                  >
                    {/* Admin & Role */}
                    <td className="border border-gray-300 px-4 py-2.5 overflow-hidden">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-2 truncate">
                          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{log.adminName}</span>
                        </span>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit mt-1">
                          {log.adminRole}
                        </span>
                      </div>
                    </td>

                    {/* Action & Feature */}
                    <td className="border border-gray-300 px-4 py-2.5 overflow-hidden">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate">{log.action}</span>
                          <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                            {log.moduleName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                          {log.targetEntity}
                        </span>
                      </div>
                    </td>

                    {/* Access Scope Badge */}
                    <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap">
                      {log.isOverride ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                          <Unlock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          CEO OVERRIDE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          STANDARD SCOPE
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          {formatRelativeTime(log.timestamp)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{formatExactDate(log.timestamp)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-300 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-600 font-medium">
            Showing <span className="font-bold text-gray-900">{filteredLogs.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
            <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)}</span> of{' '}
            <span className="font-bold text-gray-900">{filteredLogs.length}</span> activities
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-gray-700 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Log Details Audit Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-scale-in">
            <div className="p-5 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Security Audit Detail</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-gray-700">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Log ID</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">{selectedLog.id}</span>
                </div>
                {selectedLog.isOverride ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300">
                    <Unlock className="w-3.5 h-3.5 text-purple-700" /> CEO OVERRIDE GRANTED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" /> STANDARD JOB ROLE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Administrator</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{selectedLog.adminName}</p>
                  <span className="text-[10px] font-bold text-indigo-700">{selectedLog.adminRole}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Target Module</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{selectedLog.moduleName}</p>
                  <span className="text-[10px] text-gray-500 font-mono">{selectedLog.department}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-1 font-mono text-[11px]">
                <div className="text-gray-400 font-bold uppercase text-[10px]">Action Audit Payload:</div>
                <div className="text-emerald-400 font-bold">{selectedLog.action}</div>
                <div className="text-gray-300">Target: {selectedLog.targetEntity}</div>
                <div className="text-gray-400 text-[10px] pt-1 border-t border-slate-800">
                  Timestamp: {formatExactDate(selectedLog.timestamp)} ({formatRelativeTime(selectedLog.timestamp)})
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-600">
                  <span className="font-bold">IP Address:</span>
                  <span className="font-mono text-gray-900">{selectedLog.ipAddress}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="font-bold">User Device:</span>
                  <span className="font-mono text-gray-900">{selectedLog.device}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                >
                  Close Audit Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
