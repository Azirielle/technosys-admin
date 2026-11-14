// useCrewLocations: each field worker's last GPS position and whether they're on duty now. Updates live.
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tone } from '@/components/ui'

export type CrewStatus = 'on_duty' | 'no_signal' | 'off_duty'

export interface CrewLocation {
  id: string
  name: string
  role: string
  phone?: string
  lat: number
  lon: number
  /** When the phone last sent its position. */
  updatedAt: string
  status: CrewStatus
  /** Time-in of today's open shift, if any. */
  timeIn: string | null
}

export const STATUS: Record<CrewStatus, { label: string; tone: Tone }> = {
  on_duty: { label: 'On duty', tone: 'success' },
  no_signal: { label: 'No recent GPS', tone: 'warning' },
  off_duty: { label: 'Off duty', tone: 'neutral' },
}

/** A position older than this, during a shift, counts as "no recent GPS". */
const FRESH_MINUTES = 30
const REFRESH_MS = 30000

export function useCrewLocations() {
  const supabase = useMemo(() => createClient(), [])
  const [crew, setCrew] = useState<CrewLocation[]>([])
  const [loading, setLoading] = useState(true)
  const busy = useRef(false)

  const load = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    const now = Date.now()
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const [loc, shifts] = await Promise.all([
      supabase.from('live_locations').select('*, profiles!technician_id(full_name, contact_number, role)'),
      supabase.from('attendance_logs').select('technician_id, app_time_in').is('app_time_out', null).gte('created_at', dayStart.toISOString()),
    ])
    const open = new Map((shifts.data ?? []).map((s) => [s.technician_id, s.app_time_in as string | null]))
    const list: CrewLocation[] = (loc.data ?? []).map((row) => {
      const r = row as typeof row & { profiles: { full_name: string; contact_number: string | null; role: string } | null }
      const minutesAgo = (now - new Date(r.updated_at as string).getTime()) / 60000
      const onShift = open.has(r.technician_id)
      // On duty = an open shift today and a "working" position from the last 30 minutes.
      const status: CrewStatus = onShift && r.status === 'working' ? (minutesAgo < FRESH_MINUTES ? 'on_duty' : 'no_signal') : 'off_duty'
      return {
        id: r.technician_id,
        name: r.profiles?.full_name || 'Field staff',
        role: r.profiles?.role || 'technician',
        phone: r.profiles?.contact_number || undefined,
        lat: Number(r.latitude),
        lon: Number(r.longitude),
        updatedAt: r.updated_at as string,
        status,
        timeIn: open.get(r.technician_id) ?? null,
      }
    })
    const order: Record<CrewStatus, number> = { on_duty: 0, no_signal: 1, off_duty: 2 }
    list.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))
    setCrew(list)
    setLoading(false)
    busy.current = false
  }, [supabase])

  // Reload when a position or a time-in/out changes; also every 30 s so "time on shift" stays current.
  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin-live-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => load())
      .subscribe()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [load, supabase])

  return { crew, loading, reload: load }
}

/** "3 h 12 min" since time-in. */
export function timeOnShift(timeIn: string | null) {
  if (!timeIn) return null
  const mins = Math.max(0, Math.floor((Date.now() - new Date(timeIn).getTime()) / 60000))
  return `${Math.floor(mins / 60)} h ${mins % 60} min`
}
