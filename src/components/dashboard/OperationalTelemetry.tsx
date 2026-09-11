'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Radio, 
  Users, 
  AlertCircle, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Zap 
} from 'lucide-react'
import { RoleKey } from '@/lib/overrides'

export interface OperationalTelemetryProps {
  role?: RoleKey | 'ceo'
}

interface TelemetryMetrics {
  // Coordinator
  activeCrews: number
  pendingTickets: number
  unassignedSites: number
  // HR
  pendingLeaves: number
  activeWorkforce: number
  issuedWarnings: number
  // Accountant
  pendingReview: number
  missingPunches: number
  verifiedToday: number
  // CEO
  activeOverrides: number
  totalStaff: number
}

export default function OperationalTelemetry({ role }: OperationalTelemetryProps) {
  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    activeCrews: 0,
    pendingTickets: 0,
    unassignedSites: 0,
    pendingLeaves: 0,
    activeWorkforce: 0,
    issuedWarnings: 0,
    pendingReview: 0,
    missingPunches: 0,
    verifiedToday: 0,
    activeOverrides: 0,
    totalStaff: 0,
  })
  const [loading, setLoading] = useState(true)
  const isFetchingRef = useRef(false)

  const fetchMetrics = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const supabase = createClient()
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      // Active Crew calculation helper (used by Coordinator & CEO)
      const calculateActiveCrews = async () => {
        const [techRes, timeLogRes] = await Promise.all([
          supabase.from('technician_locations').select('technician_id, status, updated_at'),
          supabase
            .from('time_logs')
            .select('technician_id')
            .gte('app_time_in', todayStart.toISOString())
            .lte('app_time_in', todayEnd.toISOString())
            .is('app_time_out', null),
        ])
        const openShiftTechIds = new Set((timeLogRes.data || []).map((tl: any) => tl.technician_id))
        const now = Date.now()
        return (techRes.data || []).filter((loc: any) => {
          const diffMinutes = (now - new Date(loc.updated_at).getTime()) / (1000 * 60)
          const hasActiveShift = openShiftTechIds.has(loc.technician_id)
          return hasActiveShift && loc.status === 'working' && diffMinutes < 30
        }).length
      }

      if (role === 'hr') {
        const [leavesRes, profilesRes, warningsRes] = await Promise.all([
          supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('employment_status', 'terminated'),
          supabase.from('employee_warnings').select('*', { count: 'exact', head: true }),
        ])

        setMetrics((prev) => ({
          ...prev,
          pendingLeaves: leavesRes.count ?? 0,
          activeWorkforce: profilesRes.count ?? 0,
          issuedWarnings: warningsRes.count ?? 0,
        }))
      } else if (role === 'accountant') {
        const [reviewRes, missingRes, verifiedRes] = await Promise.all([
          supabase.from('time_logs').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
          supabase.from('time_logs').select('*', { count: 'exact', head: true }).is('app_time_out', null).lt('app_time_in', todayStart.toISOString()),
          supabase.from('time_logs').select('*', { count: 'exact', head: true }).eq('status', 'verified').gte('app_time_in', todayStart.toISOString()),
        ])

        setMetrics((prev) => ({
          ...prev,
          pendingReview: reviewRes.count ?? 0,
          missingPunches: missingRes.count ?? 0,
          verifiedToday: verifiedRes.count ?? 0,
        }))
      } else if (role === 'ceo') {
        const [overridesRes, profilesRes, activeCrewsCount] = await Promise.all([
          supabase.from('system_overrides').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          calculateActiveCrews(),
        ])

        setMetrics((prev) => ({
          ...prev,
          activeOverrides: overridesRes.count ?? 0,
          totalStaff: profilesRes.count ?? 0,
          activeCrews: activeCrewsCount,
        }))
      } else {
        // Coordinator / Default
        const [ticketRes, scheduleRes, activeCrewsCount] = await Promise.all([
          supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase
            .from('schedules')
            .select('*', { count: 'exact', head: true })
            .is('technician_id', null)
            .gte('start_time', todayStart.toISOString())
            .lte('start_time', todayEnd.toISOString()),
          calculateActiveCrews(),
        ])

        setMetrics((prev) => ({
          ...prev,
          activeCrews: activeCrewsCount,
          pendingTickets: ticketRes.count ?? 0,
          unassignedSites: scheduleRes.count ?? 0,
        }))
      }
    } catch (err) {
      console.warn('[OperationalTelemetry] Failed to fetch live metrics:', err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [role])

  useEffect(() => {
    fetchMetrics()

    const supabase = createClient()
    const channelName = `telemetry-${role || 'coordinator'}`
    const channel = supabase.channel(channelName)

    if (role === 'hr') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => fetchMetrics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchMetrics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_warnings' }, () => fetchMetrics())
    } else if (role === 'accountant') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, () => fetchMetrics())
    } else if (role === 'ceo') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_overrides' }, () => fetchMetrics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchMetrics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'technician_locations' }, () => fetchMetrics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, () => fetchMetrics())
        .on('broadcast', { event: 'location_update' }, () => fetchMetrics())
    } else {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'technician_locations' }, () => fetchMetrics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, () => fetchMetrics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchMetrics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => fetchMetrics())
        .on('broadcast', { event: 'location_update' }, () => fetchMetrics())
    }

    channel.subscribe()

    const interval = setInterval(fetchMetrics, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchMetrics, role])

  const getHeaderInfo = () => {
    switch (role) {
      case 'hr':
        return { title: 'HR Operations', pulseColor: 'text-blue-600 dark:text-blue-400', dotColor: 'bg-blue-500' }
      case 'accountant':
        return { title: 'Attendance Audit', pulseColor: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-500' }
      case 'ceo':
        return { title: 'Executive Telemetry', pulseColor: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-500' }
      default:
        return { title: 'Field Operations', pulseColor: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-500' }
    }
  }

  const { title, pulseColor, dotColor } = getHeaderInfo()

  return (
    <div className="p-3 bg-zinc-100/70 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800 rounded-xl mt-4 transition-colors duration-200">
      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3.5 h-3.5 ${pulseColor} animate-pulse`} />
          <span>{title}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
          Realtime
        </span>
      </div>

      <div className="space-y-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
        {/* HR VIEW */}
        {role === 'hr' && (
          <>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Pending Leaves
              </span>
              <span className={`font-semibold px-1.5 py-0.5 rounded border ${
                metrics.pendingLeaves > 0 
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700'
              }`}>
                {loading ? '...' : `${metrics.pendingLeaves} Pending`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Users className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Active Workforce
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/80 dark:border-zinc-700">
                {loading ? '...' : `${metrics.activeWorkforce} Staff`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <ShieldAlert className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Disciplinary Warnings
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/80 dark:border-zinc-700">
                {loading ? '...' : `${metrics.issuedWarnings} Logged`}
              </span>
            </div>
          </>
        )}

        {/* ACCOUNTANT VIEW */}
        {role === 'accountant' && (
          <>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Pending Review
              </span>
              <span className={`font-semibold px-1.5 py-0.5 rounded border ${
                metrics.pendingReview > 0 
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700'
              }`}>
                {loading ? '...' : `${metrics.pendingReview} Shifts`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <AlertTriangle className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Missing Punches
              </span>
              <span className={`font-semibold px-1.5 py-0.5 rounded border ${
                metrics.missingPunches > 0 
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700'
              }`}>
                {loading ? '...' : `${metrics.missingPunches} Active`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <CheckCircle2 className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Verified Today
              </span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                {loading ? '...' : `${metrics.verifiedToday} Logged`}
              </span>
            </div>
          </>
        )}

        {/* CEO VIEW */}
        {role === 'ceo' && (
          <>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                Active Overrides
              </span>
              <span className={`font-semibold px-1.5 py-0.5 rounded border ${
                metrics.activeOverrides > 0 
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700'
              }`}>
                {loading ? '...' : `${metrics.activeOverrides} Active`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Users className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Workforce Strength
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/80 dark:border-zinc-700">
                {loading ? '...' : `${metrics.totalStaff} Total`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Radio className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                Field Crew On Duty
              </span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                {loading ? '...' : `${metrics.activeCrews} In Field`}
              </span>
            </div>
          </>
        )}

        {/* COORDINATOR / DEFAULT VIEW */}
        {role !== 'hr' && role !== 'accountant' && role !== 'ceo' && (
          <>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Users className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Active Crews
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/80 dark:border-zinc-700">
                {loading ? '...' : `${metrics.activeCrews} On Duty`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <AlertCircle className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Pending Tickets
              </span>
              <span
                className={`font-semibold px-1.5 py-0.5 rounded border ${
                  metrics.pendingTickets > 0
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700'
                }`}
              >
                {loading ? '...' : `${metrics.pendingTickets} Open`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Calendar className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Today&apos;s Dispatches
              </span>
              <span
                className={`font-semibold px-1.5 py-0.5 rounded border ${
                  metrics.unassignedSites > 0
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700'
                }`}
              >
                {loading ? '...' : metrics.unassignedSites > 0 ? `${metrics.unassignedSites} Unassigned` : 'All Assigned'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
