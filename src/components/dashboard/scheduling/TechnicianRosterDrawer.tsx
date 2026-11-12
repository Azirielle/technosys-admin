'use client'

import React, { useState } from 'react'
import { X, Search, User, ShieldCheck, Award, Briefcase, Plus, CheckCircle2 } from 'lucide-react'
import { ProfileItem, ScheduleItem } from './types'

interface TechnicianRosterDrawerProps {
  isOpen: boolean
  onClose: () => void
  profiles: ProfileItem[]
  schedules: ScheduleItem[]
  onSelectForDispatch: (techId: string) => void
}

export default function TechnicianRosterDrawer({
  isOpen,
  onClose,
  profiles,
  schedules,
  onSelectForDispatch
}: TechnicianRosterDrawerProps) {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | 'senior' | 'technician' | 'helper'>('all')

  if (!isOpen) return null

  // Count active/scheduled dispatches per tech today
  const techWorkloadMap = new Map<string, number>()
  schedules.forEach(s => {
    if (s.technician_id && s.status !== 'cancelled') {
      const count = techWorkloadMap.get(s.technician_id) || 0
      techWorkloadMap.set(s.technician_id, count + 1)
    }
  })

  const filtered = profiles
    .filter(p => {
      if (tierFilter === 'all') return true
      if (tierFilter === 'senior') return p.technician_level === 'senior'
      if (tierFilter === 'technician') return p.technician_level === 'technician'
      if (tierFilter === 'helper') return p.role === 'helper' || p.technician_level === 'helper'
      return true
    })
    .filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Frosted Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Slide-over Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
            <div>
              <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Field Staff Roster</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {profiles.length} Total
                </span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Real-time technician workload, tier qualifications, and availability.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Tier Filters */}
          <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <div className="relative">
              <Search className="absolute inset-y-0 left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by technician name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
              {(['all', 'senior', 'technician', 'helper'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                    tierFilter === tier
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Roster Cards List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                No technicians match the filter.
              </div>
            ) : (
              filtered.map(p => {
                const assignedCount = techWorkloadMap.get(p.id) || 0
                const isOnLeave = p.lifecycle_status === 'on_leave'

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 font-bold text-xs ${
                        isOnLeave
                          ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900'
                          : p.technician_level === 'senior'
                          ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950 dark:border-purple-800'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                      }`}>
                        {p.full_name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {p.full_name}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                            p.technician_level === 'senior'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                              : p.role === 'helper'
                              ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                          }`}>
                            {p.technician_level || p.role}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          {isOnLeave ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              ● On Approved Leave
                            </span>
                          ) : assignedCount > 0 ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              ● {assignedCount} job{assignedCount > 1 ? 's' : ''} assigned
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              ● Available / Ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Dispatch Action */}
                    {!isOnLeave && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectForDispatch(p.id)
                          onClose()
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-md transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Dispatch</span>
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
