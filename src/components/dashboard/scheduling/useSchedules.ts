// useSchedules: loads the jobs for the chosen day/week/month (plus ongoing out-of-town jobs), field staff and temporary workers.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCasualHelpers } from '@/app/actions/schedules'
import { findConflicts } from './conflicts'
import type { CasualHelperItem, HorizonGranularity, ProfileItem, ScheduleItem } from './types'

const JOB_SELECT = `
  *,
  profiles!technician_id(full_name, role, technician_level, is_driver),
  senior_partner:profiles!senior_partner_id(full_name),
  schedule_crew_assignments:schedule_crew(
    id, technician_id, assignment_role, status, joined_at, released_at, notes,
    profiles(full_name, role, technician_level, is_driver)
  ),
  schedule_casual_helpers(id, casual_helper_id, casual_helpers(id, full_name, contact_number))
`

/** Start and end of the period shown. "past" is everything before today. */
function periodOf(date: Date, granularity: HorizonGranularity) {
  const start = new Date(date)
  const end = new Date(date)
  if (granularity === 'week') {
    const day = start.getDay()
    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1)) // Monday
    end.setTime(start.getTime())
    end.setDate(start.getDate() + 6)
  } else if (granularity === 'month') {
    start.setDate(1)
    end.setMonth(start.getMonth() + 1, 0)
  } else if (granularity === 'past') {
    start.setTime(0)
    end.setTime(Date.now())
    end.setDate(end.getDate() - 1)
  }
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function useSchedules(date: Date, granularity: HorizonGranularity) {
  const supabase = useMemo(() => createClient(), [])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [profiles, setProfiles] = useState<ProfileItem[]>([])
  const [casualHelpers, setCasualHelpers] = useState<CasualHelperItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHelpers, setLoadingHelpers] = useState(false)

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    const { start, end } = periodOf(date, granularity)
    const { data, error } = await supabase
      .from('schedules')
      .select(JOB_SELECT)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time', { ascending: granularity !== 'past' })
    if (error) console.error('Failed to load jobs:', error.message)
    const jobs = (data ?? []) as unknown as ScheduleItem[]

    // Out-of-town jobs that started earlier but are still running in this period.
    if (granularity !== 'past') {
      const { data: running } = await supabase
        .from('schedules')
        .select(JOB_SELECT)
        .eq('assignment_type', 'deployment')
        .neq('status', 'cancelled')
        .lte('start_time', end.toISOString())
      const ids = new Set(jobs.map((j) => j.id))
      for (const dep of (running ?? []) as unknown as ScheduleItem[]) {
        const depEnd = dep.end_time ?? dep.target_review_date
        if (!ids.has(dep.id) && (!depEnd || new Date(depEnd).getTime() >= start.getTime())) jobs.push(dep)
      }
    }
    setSchedules(jobs)
    setLoading(false)
  }, [supabase, date, granularity])

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, lifecycle_status, technician_level, is_driver')
      .in('role', ['technician', 'helper'])
      .order('full_name')
    if (data) setProfiles(data as unknown as ProfileItem[])
  }, [supabase])

  const loadHelpers = useCallback(async () => {
    setLoadingHelpers(true)
    const res = await getCasualHelpers()
    if (res?.success && res.helpers) setCasualHelpers(res.helpers as CasualHelperItem[])
    setLoadingHelpers(false)
  }, [])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  useEffect(() => {
    loadProfiles()
    loadHelpers()
  }, [loadProfiles, loadHelpers])

  const conflicts = useMemo(() => findConflicts(schedules), [schedules])
  const counts = useMemo(() => {
    const active = schedules.filter((s) => s.status !== 'cancelled')
    return {
      onSite: active.filter((s) => s.assignment_type === 'on_site' || !s.assignment_type).length,
      deployments: active.filter((s) => s.assignment_type === 'deployment').length,
      needsTeam: active.filter((s) => !s.technician_id || s.status === 'unassigned').length,
      conflicts: conflicts.size,
    }
  }, [schedules, conflicts])

  return { schedules, profiles, casualHelpers, loading, loadingHelpers, conflicts, counts, loadSchedules, loadHelpers }
}
