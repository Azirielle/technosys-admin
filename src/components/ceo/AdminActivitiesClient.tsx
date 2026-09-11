'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  X,
  RefreshCw
} from 'lucide-react'
import { getActivityLogs, ActivityLog } from '@/app/actions/activity'

const MODULE_MAP: Record<string, { label: string; department: string }> = {
  system_overrides: { label: 'System Overrides', department: 'Executive Governance' },
  schedule: { label: 'Dispatch & Scheduling', department: 'Field Operations' },
  inventory: { label: 'Inventory Management', department: 'Field Operations' },
  tickets: { label: 'Tickets & Leaves', department: 'HR Department' },
  leaves: { label: 'Leave Management', department: 'HR Department' },
  employee: { label: '201 Personnel Files', department: 'HR Department' },
  compliance: { label: 'Compliance & Audits', department: 'HR Department' },
  attendance: { label: 'Attendance & Tracking', department: 'Field Operations' },
  audit: { label: 'Audit Logs', department: 'Finance & Accounting' },
  payroll: { label: 'Payroll Audit', department: 'Finance & Accounting' },
  settings: { label: 'Branch & Geofence', department: 'Operations' },
  announcement: { label: 'Announcements', department: 'Administration' },
  push_infrastructure: { label: 'Push Infrastructure', department: 'System Core' },
  other: { label: 'System Operation', department: 'System' }
}

const ROLE_LABELS: Record<string, string> = {
  ceo: 'CEO',
  super_admin: 'Super Admin',
  admin: 'Administrator',
  hr: 'HR Department',
  accountant: 'Accountant',
  coordinator: 'Field Operations',
  system: 'System Core',
  staff: 'Staff Member'
}

function formatExecutiveTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    return `${month} ${day}, ${year} • ${hours}:${minutes} ${ampm}`
  } catch {
    return isoString
  }
}

function formatExecutiveDateDetailed(isoString: string): string {
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const fullMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const month = fullMonths[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const seconds = d.getSeconds().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    return `${month} ${day}, ${year} at ${hours}:${minutes}:${seconds} ${ampm}`
  } catch {
    return isoString
  }
}

function formatActionType(action: string): string {
  if (!action) return 'Action'
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function AdminActivitiesClient() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'override' | 'standard'>('override')
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 7

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getActivityLogs('all', 1, 150)
      if (res.logs) {
        setActivities(res.logs)
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Tab counts
  const overrideCount = useMemo(() => activities.filter(l => l.is_override).length, [activities])
  const standardCount = useMemo(() => activities.filter(l => !l.is_override).length, [activities])

  // Filter logs based on active tab and search filters
  const filteredLogs = useMemo(() => {
    return activities.filter(log => {
      // Category / Tab filter
      if (activeTab === 'override' && !log.is_override) return false
      if (activeTab === 'standard' && log.is_override) return false

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = (log.performed_by_name || '').toLowerCase().includes(q)
        const matchAction = log.action.toLowerCase().includes(q)
        const matchDesc = log.description.toLowerCase().includes(q)
        const mod = MODULE_MAP[log.category]?.label || log.category
        const matchMod = mod.toLowerCase().includes(q)
        if (!matchName && !matchAction && !matchDesc && !matchMod) return false
      }

      // Role filter
      if (selectedRole !== 'all') {
        const role = log.performed_by_role || 'system'
        if (role !== selectedRole) return false
      }

      // Category / Module filter
      if (selectedCategory !== 'all' && log.category !== selectedCategory) {
        return false
      }

      return true
    })
  }, [activities, activeTab, search, selectedRole, selectedCategory])

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredLogs, currentPage, ITEMS_PER_PAGE])

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden p-6 space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            Administrator Activity Audit Logs
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Pinnacle Chief Executive Officer oversight. Track and verify admin activities executed under standard scope vs. CEO-granted overrides.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-lg border border-zinc-200 transition-colors self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Main Filter & Navigation Tabs Card */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs flex-1 flex flex-col min-h-0">
        {/* Category Tabs Header */}
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 pt-3 flex flex-col shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('override'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                activeTab === 'override'
                  ? 'bg-white text-blue-900 border-blue-600 shadow-2xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-900 border-transparent hover:bg-zinc-100/70'
              }`}
            >
              <Unlock className="w-3.5 h-3.5 text-purple-600" />
              <span>CEO Granted Override Activities</span>
              <span className="ml-1 bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {overrideCount}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('standard'); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                activeTab === 'standard'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-blue-600 dark:border-blue-500 shadow-2xs font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Standard Scope Activities</span>
              <span className="ml-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {standardCount}
              </span>
            </button>
          </div>

          {/* Context Explainer */}
          <div className="py-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 border-t border-zinc-200/80 mt-1">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              {activeTab === 'override' 
                ? 'Displaying operations logged across modules outside standard department permissions or under CEO overrides.'
                : 'Displaying standard day-to-day operations performed by administrators and technicians within their authorized roles.'}
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search administrator name, action, or description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              Role:
            </div>
            <select
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="ceo">CEO</option>
              <option value="super_admin">Super Admin</option>
              <option value="accountant">Accountant</option>
              <option value="coordinator">Field Operations</option>
              <option value="hr">HR Department</option>
              <option value="system">System Core</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 ml-2">
              Module:
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Modules</option>
              <option value="system_overrides">System Overrides</option>
              <option value="schedule">Dispatch & Scheduling</option>
              <option value="inventory">Inventory Management</option>
              <option value="tickets">Tickets & Leaves</option>
              <option value="employee">201 Personnel Files</option>
              <option value="attendance">Attendance & Tracking</option>
              <option value="settings">Branch & Geofence</option>
              <option value="announcement">Announcements</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-y-auto flex-1 [scrollbar-gutter:stable]">
          <table className="w-full border-collapse table-fixed">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 z-10 border-b border-zinc-200/80 dark:border-zinc-800">
              <tr>
                <th className="border-r border-zinc-200 px-3.5 py-2.5 text-left text-[11px] font-semibold text-zinc-600 uppercase tracking-wider w-[24%]">
                  Administrator & Role
                </th>
                <th className="border-r border-zinc-200 px-3.5 py-2.5 text-left text-[11px] font-semibold text-zinc-600 uppercase tracking-wider w-[42%]">
                  Action & Module Description
                </th>
                <th className="border-r border-zinc-200 px-3.5 py-2.5 text-left text-[11px] font-semibold text-zinc-600 uppercase tracking-wider w-[16%]">
                  Access Scope
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold text-zinc-600 uppercase tracking-wider w-[18%]">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200/80 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      <span className="text-xs font-medium">Fetching real activity logs...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <ShieldAlert className="w-6 h-6 text-zinc-400 mb-1" />
                      <p className="text-xs font-semibold text-zinc-700">No activity logs found</p>
                      <p className="text-[11px] text-zinc-400">No activities match your current tab or filter selections.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const modInfo = MODULE_MAP[log.category] || { label: log.category, department: 'System' }
                  const roleLabel = ROLE_LABELS[log.performed_by_role || ''] || log.performed_by_role || 'Staff'

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      {/* Admin & Role */}
                      <td className="border-r border-zinc-200 px-3.5 py-2.5 overflow-hidden">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                            <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{log.performed_by_name || 'System'}</span>
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 w-fit mt-1">
                            {roleLabel}
                          </span>
                        </div>
                      </td>

                      {/* Action & Feature */}
                      <td className="border-r border-zinc-200 px-3.5 py-2.5 overflow-hidden">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-bold text-zinc-900 truncate">
                              {formatActionType(log.action)}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 shrink-0">
                              {modInfo.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 truncate mt-0.5 font-normal">
                            {log.description}
                          </span>
                        </div>
                      </td>

                      {/* Access Scope Badge */}
                      <td className="border-r border-zinc-200 px-3.5 py-2.5 whitespace-nowrap">
                        {log.is_override ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs">
                            <Unlock className="w-3 h-3 text-purple-700 shrink-0" />
                            CEO OVERRIDE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                            STANDARD SCOPE
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{formatExecutiveTimestamp(log.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-500 font-medium">
            Showing <span className="font-semibold text-zinc-900">{filteredLogs.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
            <span className="font-semibold text-zinc-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)}</span> of{' '}
            <span className="font-semibold text-zinc-900">{filteredLogs.length}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 bg-white border border-zinc-200 rounded-md text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-zinc-700 px-2">
              {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 bg-white border border-zinc-200 rounded-md text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Log Details Security Audit Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm tracking-tight">Security Audit Detail</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-zinc-700">
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Log ID</span>
                  <span className="font-mono font-bold text-zinc-900 text-xs">{selectedLog.id}</span>
                </div>
                {selectedLog.is_override ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                    <Unlock className="w-3.5 h-3.5 text-purple-700" /> CEO OVERRIDE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" /> STANDARD SCOPE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Administrator</span>
                  <p className="font-bold text-zinc-900 text-xs mt-0.5">{selectedLog.performed_by_name || 'System'}</p>
                  <span className="text-[10px] font-semibold text-blue-700">{ROLE_LABELS[selectedLog.performed_by_role || ''] || selectedLog.performed_by_role || 'Staff'}</span>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Module & Department</span>
                  <p className="font-bold text-zinc-900 text-xs mt-0.5">{MODULE_MAP[selectedLog.category]?.label || selectedLog.category}</p>
                  <span className="text-[10px] text-zinc-500 font-medium">{MODULE_MAP[selectedLog.category]?.department || 'System'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-900 text-zinc-100 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">Action Payload Description</div>
                <div className="text-emerald-400 font-bold">{formatActionType(selectedLog.action)}</div>
                <div className="text-zinc-300 font-sans text-xs">{selectedLog.description}</div>
                <div className="text-zinc-400 text-[10px] pt-1.5 border-t border-zinc-800 font-mono">
                  Executive Timestamp: {formatExecutiveDateDetailed(selectedLog.created_at)}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
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
