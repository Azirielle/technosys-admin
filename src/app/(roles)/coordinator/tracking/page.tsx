'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, Search, Minimize2, Maximize2, Users, Phone, ShieldCheck, AlertCircle, RefreshCw, Zap } from 'lucide-react'

// Dynamically import Leaflet map to prevent SSR window errors
const LiveMapWrapper = dynamic(() => import('@/components/dashboard/LiveMapWrapper'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-400 font-medium">Initializing Map Engine...</div>
})

export type TechLocation = {
  id: string
  lat: number
  lon: number
  name: string
  phone?: string
  role?: string
  isOnline: boolean
  hasActiveShift: boolean
  shiftStartedAt?: string | null
  shiftDuration?: string | null
  time: string
  status: 'working' | 'offline' | 'stale' | 'off_duty'
  geofenceStatus?: string | null
}

export default function TrackingPage() {
  const [locations, setLocations] = useState<TechLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'on_duty' | 'all'>('on_duty')
  const isFetchingRef = useRef(false)
  const supabase = createClient()

  const fetchLocations = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const now = new Date()
      const dayStart = new Date(now)
      dayStart.setHours(0, 0, 0, 0)

      // Parallel query: technician locations + active open time_logs (app_time_out IS NULL)
      const [locRes, logsRes] = await Promise.all([
        supabase
          .from('technician_locations')
          .select('*, profiles!technician_id(id, full_name, contact_number, role)'),
        supabase
          .from('time_logs')
          .select('id, technician_id, app_time_in, geofence_status, status')
          .is('app_time_out', null)
          .gte('created_at', dayStart.toISOString())
      ])

      const activeLogs = logsRes.data || []
      const activeShiftMap = new Map<string, any>(
        activeLogs.map(l => [l.technician_id, l])
      )

      if (locRes.data) {
        const formatted: TechLocation[] = locRes.data.map((loc: any) => {
          const updatedTime = new Date(loc.updated_at)
          const diffMinutes = (now.getTime() - updatedTime.getTime()) / (1000 * 60)
          const activeLog = activeShiftMap.get(loc.technician_id)
          const hasActiveShift = !!activeLog

          // DUTY-BOUND INVARIANT:
          // A technician is strictly on duty ONLY IF they have an un-ended shift (app_time_out IS NULL)
          // within today, their location status is 'working', and updated within 30 minutes
          const isOnline = hasActiveShift && loc.status === 'working' && diffMinutes < 30

          let shiftDuration: string | null = null
          if (activeLog?.app_time_in) {
            const shiftMs = Math.max(0, now.getTime() - new Date(activeLog.app_time_in).getTime())
            const h = Math.floor(shiftMs / (1000 * 60 * 60))
            const m = Math.floor((shiftMs % (1000 * 60 * 60)) / (1000 * 60))
            shiftDuration = `${h}h ${m}m`
          }

          let resolvedStatus: 'working' | 'offline' | 'stale' | 'off_duty' = 'off_duty'
          if (isOnline) {
            resolvedStatus = 'working'
          } else if (hasActiveShift && loc.status === 'working') {
            resolvedStatus = 'stale'
          } else if (loc.status === 'offline') {
            resolvedStatus = 'offline'
          } else {
            resolvedStatus = 'off_duty'
          }

          return {
            id: loc.technician_id,
            lat: Number(loc.latitude),
            lon: Number(loc.longitude),
            name: loc.profiles?.full_name || 'Unknown Tech',
            phone: loc.profiles?.contact_number || undefined,
            role: loc.profiles?.role || 'technician',
            isOnline,
            hasActiveShift,
            shiftStartedAt: activeLog?.app_time_in || null,
            shiftDuration,
            time: updatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: resolvedStatus,
            geofenceStatus: activeLog?.geofence_status || null,
          }
        })

        // Sort: On-duty first, then alphabetically by name
        formatted.sort((a, b) => {
          if (a.isOnline === b.isOnline) return a.name.localeCompare(b.name)
          return a.isOnline ? -1 : 1
        })

        setLocations(formatted)
      }
    } catch (err) {
      console.warn('[FleetTracking] Error fetching fleet locations:', err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [supabase])

  useEffect(() => {
    fetchLocations()

    // Real-Time Fleet Tracking Bridge
    const channel = supabase
      .channel('admin-fleet-tracking-hub')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'technician_locations' },
        () => {
          fetchLocations()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_logs' },
        () => {
          // Captures instant clock-in and clock-out events
          fetchLocations()
        }
      )
      .on('broadcast', { event: 'location_update' }, () => {
        fetchLocations()
      })
      .subscribe()

    // 30-second polling fallback to keep elapsed shift times fresh
    const interval = setInterval(fetchLocations, 30000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchLocations, supabase])

  // Filter locations according to search query and viewMode
  const displayedLocations = locations.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    if (viewMode === 'on_duty') {
      return l.isOnline
    }
    return true
  })

  const activeCount = locations.filter(l => l.isOnline).length
  const totalCount = locations.length

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] w-[calc(100%+4rem)] -m-8 relative overflow-hidden bg-gray-100">
      {/* Background Map Engine */}
      <div className="absolute inset-0 z-0">
        <LiveMapWrapper locations={displayedLocations} selectedTechId={selectedTechId} />
      </div>

      {/* Floating Collapsible Window Control Panel */}
      <div 
        className={`absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-200 transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${
          isCollapsed ? 'w-72 max-h-14 cursor-pointer hover:bg-gray-50' : 'w-84 max-h-[calc(100vh-6rem)]'
        }`}
      >
        {/* Window Header */}
        <div 
          onClick={() => isCollapsed && setIsCollapsed(false)}
          className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-gray-900 truncate">Fleet Radar</h1>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  activeCount > 0 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse' 
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {activeCount} On Duty
                </span>
              </div>
              {!isCollapsed && (
                <p className="text-[11px] text-gray-500 font-medium truncate">Duty-bound live operations</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fetchLocations()
              }}
              title="Refresh Fleet Data"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsCollapsed(!isCollapsed)
              }}
              title={isCollapsed ? "Expand Fleet Tracking Window" : "Minimize Window"}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isCollapsed ? <Maximize2 className="w-4 h-4 text-indigo-600" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Content Body */}
        {!isCollapsed && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* View Mode Switcher */}
            <div className="p-2 border-b border-gray-100 bg-gray-50/50 flex gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('on_duty')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  viewMode === 'on_duty'
                    ? 'bg-white text-indigo-600 shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <span>On Duty</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 ml-0.5">
                  {activeCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  viewMode === 'all'
                    ? 'bg-white text-indigo-600 shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>All Fleet</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-700 border border-gray-200 ml-0.5">
                  {totalCount}
                </span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-3 py-2.5 border-b border-gray-100 shrink-0 bg-white">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search technician name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50/60 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-gray-900"
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading && locations.length === 0 ? (
                <div className="py-8 text-center">
                  <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">Resolving active shifts...</p>
                </div>
              ) : displayedLocations.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-2">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-800">
                    {viewMode === 'on_duty' ? 'No Technicians On Duty' : 'No Technicians Found'}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {viewMode === 'on_duty' 
                      ? 'Technicians will automatically appear here once they clock in from their mobile kiosk.'
                      : 'No records match your search filter.'}
                  </p>
                </div>
              ) : (
                displayedLocations.map(tech => {
                  const isSelected = tech.id === selectedTechId
                  return (
                    <div 
                      key={tech.id} 
                      onClick={() => setSelectedTechId(isSelected ? null : tech.id)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20' 
                          : 'hover:bg-gray-50 bg-white border-gray-100 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Avatar / Indicator */}
                        <div className="relative shrink-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs border-2 border-white ${
                            tech.isOnline 
                              ? 'bg-emerald-500 ring-2 ring-emerald-400/30' 
                              : tech.status === 'stale'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          } transition-colors`}>
                            {tech.name.charAt(0).toUpperCase()}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            tech.isOnline ? 'bg-emerald-500' : tech.status === 'stale' ? 'bg-amber-400' : 'bg-gray-400'
                          }`} />
                        </div>

                        {/* Info Block */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                              {tech.name}
                            </p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                              tech.isOnline 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : tech.status === 'stale'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {tech.isOnline ? 'ON DUTY' : tech.status === 'stale' ? 'STALE GPS' : 'OFF DUTY'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {tech.isOnline && tech.shiftDuration ? (
                                <span className="font-semibold text-emerald-700">
                                  {tech.shiftDuration} (In: {new Date(tech.shiftStartedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              ) : (
                                <span>Ping: {tech.time}</span>
                              )}
                            </div>

                            {/* 1-Tap Direct Call */}
                            {tech.phone && (
                              <a
                                href={`tel:${tech.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                title={`Call ${tech.name} (${tech.phone})`}
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/80 text-[10px] text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1 font-medium">
                <Zap className="w-3 h-3 text-amber-500" />
                Live Realtime Sync
              </span>
              <span>
                {viewMode === 'on_duty' ? `${activeCount} On Duty` : `${totalCount} Total`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

