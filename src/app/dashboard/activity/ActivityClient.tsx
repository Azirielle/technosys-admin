'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Calendar, ClipboardList, DollarSign, MessageSquare, Package, Settings, HelpCircle, Activity, Search } from 'lucide-react'

const CATEGORIES = [
  { id: 'all', label: 'All Activities', icon: Activity, color: 'text-slate-500' },
  { id: 'employee', label: 'Employees', icon: Users, color: 'text-cyan-500' },
  { id: 'schedule', label: 'Schedules', icon: Calendar, color: 'text-indigo-500' },
  { id: 'leave', label: 'Leaves', icon: ClipboardList, color: 'text-rose-500' },
  { id: 'payroll', label: 'Payroll', icon: DollarSign, color: 'text-emerald-500' },
  { id: 'ticket', label: 'Tickets', icon: MessageSquare, color: 'text-amber-500' },
  { id: 'inventory', label: 'Inventory', icon: Package, color: 'text-blue-500' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-500' },
]

export default function ActivityClient({ initialLogs }: { initialLogs: any[] }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'employee': return { icon: Users, bg: 'bg-cyan-50 border-cyan-100 text-cyan-600' }
      case 'schedule': return { icon: Calendar, bg: 'bg-indigo-50 border-indigo-100 text-indigo-600' }
      case 'leave': return { icon: ClipboardList, bg: 'bg-rose-50 border-rose-100 text-rose-600' }
      case 'payroll': return { icon: DollarSign, bg: 'bg-emerald-50 border-emerald-100 text-emerald-600' }
      case 'ticket': return { icon: MessageSquare, bg: 'bg-amber-50 border-amber-100 text-amber-600' }
      case 'inventory': return { icon: Package, bg: 'bg-blue-50 border-blue-100 text-blue-600' }
      case 'settings': return { icon: Settings, bg: 'bg-slate-50 border-slate-100 text-slate-600' }
      default: return { icon: HelpCircle, bg: 'bg-zinc-50 border-zinc-100 text-zinc-600' }
    }
  }

  // Filter logs based on category and search query
  const filteredLogs = initialLogs.filter((log) => {
    const matchesCategory = selectedCategory === 'all' || log.target_category === selectedCategory
    const matchesSearch = log.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (log.actor?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">System Activity Ledger</h1>
          <p className="text-slate-500 font-medium mt-0.5">Administrative audit trail and event logs</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="mt-8 grid gap-8 grid-cols-1 lg:grid-cols-4 items-start">
        
        {/* Categories Sidebar */}
        <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-3">Filter Category</h3>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const active = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
                  active 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-600' : cat.color}`} />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Audit Log list */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail by description or actor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>

          {/* List Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Event Log ({filteredLogs.length})</span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Real-time Feed</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {filteredLogs.map((log: any, i: number) => {
                const { icon: Icon, bg } = getCategoryIcon(log.target_category)
                return (
                  <div key={log.id || i} className="p-6 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${bg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <p className="text-sm font-bold text-slate-900 leading-snug">{log.description}</p>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          {new Date(log.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-600 bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-md">
                          Actor: {log.actor?.full_name || 'System'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400 capitalize font-medium">
                          {log.target_category} log
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-mono text-[10px] text-slate-400 font-medium">
                          Action: {log.action_type}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredLogs.length === 0 && (
                <div className="p-12 text-center">
                  <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-700">No matching activity logs found</h3>
                  <p className="text-slate-400 text-sm mt-1">Try resetting your category filters or refinement query.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
