'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Radio, Users, AlertCircle, Calendar } from 'lucide-react';

interface TelemetryMetrics {
  activeCrews: number;
  pendingTickets: number;
  unassignedSites: number;
}

export default function OperationalTelemetry() {
  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    activeCrews: 0,
    pendingTickets: 0,
    unassignedSites: 0,
  });
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const fetchMetrics = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const supabase = createClient();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [techRes, ticketRes, scheduleRes, timeLogRes] = await Promise.all([
        // 1. Query technician locations for online status
        supabase
          .from('technician_locations')
          .select('technician_id, status, updated_at'),
        
        // 2. Query open tickets
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open'),

        // 3. Query today's unassigned schedules
        supabase
          .from('schedules')
          .select('*', { count: 'exact', head: true })
          .is('technician_id', null)
          .gte('start_time', todayStart.toISOString())
          .lte('start_time', todayEnd.toISOString()),

        // 4. Query today's open shifts (Duty-Bound check)
        supabase
          .from('time_logs')
          .select('technician_id')
          .gte('app_time_in', todayStart.toISOString())
          .lte('app_time_in', todayEnd.toISOString())
          .is('app_time_out', null),
      ]);

      const openShiftTechIds = new Set((timeLogRes.data || []).map((tl: any) => tl.technician_id));
      const now = Date.now();
      const activeCrews = (techRes.data || []).filter((loc: any) => {
        const diffMinutes = (now - new Date(loc.updated_at).getTime()) / (1000 * 60);
        const hasActiveShift = openShiftTechIds.has(loc.technician_id);
        return hasActiveShift && loc.status === 'working' && diffMinutes < 30;
      }).length;

      const pendingTickets = ticketRes.count ?? 0;
      const unassignedSites = scheduleRes.count ?? 0;

      setMetrics({
        activeCrews,
        pendingTickets,
        unassignedSites,
      });
    } catch (err) {
      console.warn('[OperationalTelemetry] Failed to fetch live metrics:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    const supabase = createClient();
    const channel = supabase
      .channel('admin-operational-telemetry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technician_locations' }, () => {
        fetchMetrics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, () => {
        fetchMetrics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchMetrics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        fetchMetrics();
      })
      .on('broadcast', { event: 'location_update' }, () => {
        fetchMetrics();
      })
      .subscribe();

    // Heartbeat check every 30s to refresh stale technician offline transitions
    const interval = setInterval(fetchMetrics, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchMetrics]);

  return (
    <div className="p-3 bg-zinc-100/70 border border-zinc-200/60 rounded-xl mt-4">
      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 mb-2">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Live Operations</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Realtime
        </span>
      </div>

      <div className="space-y-1.5 text-[10px] text-zinc-500">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-600">
            <Users className="w-3 h-3 text-zinc-400" />
            Active Crews
          </span>
          <span className="font-semibold text-zinc-800 bg-white px-1.5 py-0.5 rounded border border-zinc-200/80">
            {loading ? '...' : `${metrics.activeCrews} On Duty`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-600">
            <AlertCircle className="w-3 h-3 text-zinc-400" />
            Pending Tickets
          </span>
          <span
            className={`font-semibold px-1.5 py-0.5 rounded border ${
              metrics.pendingTickets > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-zinc-800 border-zinc-200/80'
            }`}
          >
            {loading ? '...' : `${metrics.pendingTickets} Open`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-600">
            <Calendar className="w-3 h-3 text-zinc-400" />
            Today&apos;s Dispatches
          </span>
          <span
            className={`font-semibold px-1.5 py-0.5 rounded border ${
              metrics.unassignedSites > 0
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-zinc-800 border-zinc-200/80'
            }`}
          >
            {loading ? '...' : metrics.unassignedSites > 0 ? `${metrics.unassignedSites} Unassigned` : 'All Assigned'}
          </span>
        </div>
      </div>
    </div>
  );
}
