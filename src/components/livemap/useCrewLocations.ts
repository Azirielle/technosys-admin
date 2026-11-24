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
  avatar?: string
  lat: number
  lon: number
  /** When the phone last sent its position. */
  updatedAt: string
  status: CrewStatus
  /** Time-in of today's open shift, if any. */
  timeIn: string | null
  /** Client of today's job (planned or ongoing), if any. */
  jobName: string | null
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
  const again = useRef(false) // a change arrived while loading: load once more so the newest position shows

  const load = useCallback(async () => {
    if (busy.current) { again.current = true; return }
    busy.current = true
    do {
      again.current = false
      const now = Date.now()
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
      const [loc, shifts, jobs] = await Promise.all([
        supabase.from('live_locations').select('*, profiles!technician_id(full_name, contact_number, role, avatar_url)'),
        supabase.from('work_days').select('person_id, time_in').is('time_out', null).eq('work_date', today),
        // One query for everyone's job today (not one per person).
        supabase.from('job_members').select('person_id, job:jobs!inner(client_name, project_name)')
          .is('removed_at', null).in('job.status', ['planned', 'ongoing']).lte('job.start_date', today).gte('job.end_date', today),
      ])
      const jobOf = new Map((jobs.data ?? []).map((j) => [j.person_id, j.job?.project_name || j.job?.client_name || null]))
      const open = new Map((shifts.data ?? []).map((s) => [s.person_id, s.time_in as string | null]))
      const list: CrewLocation[] = (loc.data ?? []).map((row) => {
        const r = row as typeof row & { profiles: { full_name: string; contact_number: string | null; role: string; avatar_url: string | null } | null }
        const minutesAgo = (now - new Date(r.updated_at as string).getTime()) / 60000
        const onShift = open.has(r.technician_id)
        // On duty = an open shift today and a "working" position from the last 30 minutes.
        const status: CrewStatus = onShift && r.status === 'working' ? (minutesAgo < FRESH_MINUTES ? 'on_duty' : 'no_signal') : 'off_duty'
        return {
          id: r.technician_id,
          name: r.profiles?.full_name || 'Field staff',
          role: r.profiles?.role || 'technician',
          phone: r.profiles?.contact_number || undefined,
        avatar: r.profiles?.avatar_url || undefined,
          lat: Number(r.latitude),
          lon: Number(r.longitude),
          updatedAt: r.updated_at as string,
          status,
          timeIn: open.get(r.technician_id) ?? null,
          jobName: jobOf.get(r.technician_id) ?? null,
        }
      })
      const order: Record<CrewStatus, number> = { on_duty: 0, no_signal: 1, off_duty: 2 }
      list.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))
      setCrew(list)
      setLoading(false)
    } while (again.current)
    busy.current = false
  }, [supabase])

  // Reload when a position or a time-in/out changes; also every 30 s so "time on shift" stays current.
  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin-live-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_days' }, () => load())
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
