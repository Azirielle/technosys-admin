"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ActivityLog } from '@/app/actions/activity'
import { 
  Search, 
  Users, 
  Calendar, 
  ClipboardList, 
  DollarSign, 
  MessageSquare, 
  Package, 
  ShieldCheck, 
  HelpCircle,
  Clock,
  User,
  Filter,
  RefreshCw
} from 'lucide-react'

const categoryConfig: Record<string, { label: string; icon: any; bg: string; text: string; border: string }> = {
  employees: { label: 'Employees', icon: Users, bg: 'bg-cyan-50/70', text: 'text-cyan-700', border: 'border-cyan-200' },
  schedules: { label: 'Schedules', icon: Calendar, bg: 'bg-indigo-50/70', text: 'text-indigo-700', border: 'border-indigo-200' },
  leaves: { label: 'Leaves', icon: ClipboardList, bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-200' },
  payroll: { label: 'Payroll', icon: DollarSign, bg: 'bg-emerald-50/70', text: 'text-emerald-700', border: 'border-emerald-200' },
  tickets: { label: 'Tickets', icon: MessageSquare, bg: 'bg-blue-50/70', text: 'text-blue-700', border: 'border-blue-200' },
  inventory: { label: 'Inventory', icon: Package, bg: 'bg-purple-50/70', text: 'text-purple-700', border: 'border-purple-200' },
  compliance: { label: 'Compliance', icon: ShieldCheck, bg: 'bg-rose-50/70', text: 'text-rose-700', border: 'border-rose-200' },
  other: { label: 'Other', icon: HelpCircle, bg: 'bg-slate-100/70', text: 'text-slate-700', border: 'border-slate-200' }
}

function getCategoryStyle(category: string) {
  return categoryConfig[category] || categoryConfig.other
}

function formatDateTime(dateString: string) {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  } catch (e) {
    return dateString
  }
}

export default function ActivityWorkspace({ initialLogs }: { initialLogs: ActivityLog[] }) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isRealtimeActive, setIsRealtimeActive] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to INSERT events in the activity_logs table
    const channel = supabase
      .channel('realtime_activity_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          const newLog = payload.new as ActivityLog
          setLogs((prev) => {
            // Avoid duplicate additions if any occur
            if (prev.some(log => log.id === newLog.id)) return prev
            return [newLog, ...prev]
          })
        }
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter
    
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      log.description.toLowerCase().includes(searchLower) ||
      (log.performed_by_name || '').toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.category.toLowerCase().includes(searchLower)
      
    return matchesCategory && matchesSearch
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Controls Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs by description, performer, action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryConfig).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center pr-1 text-slate-500">
              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        {/* Real-time Status Indicator */}
        <div className="flex items-center gap-2 self-end md:self-auto bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <span className={`relative flex h-2 w-2`}>
            {isRealtimeActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isRealtimeActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
          </span>
          <span className="text-xs font-semibold text-slate-600">
            {isRealtimeActive ? 'Live Sync Active' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Logs Table Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                    No matching activity logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const style = getCategoryStyle(log.category)
                  const Icon = style.icon
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(log.created_at)}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {style.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-semibold text-slate-700 capitalize">
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium max-w-md break-words">
                        {log.description}
                      </td>

                      {/* Performed By */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{log.performed_by_name || 'System'}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Showing {filteredLogs.length} of {logs.length} total logs</span>
          <span>Only showing the latest 100 entries for performance</span>
        </div>
      </div>
    </div>
  )
}
