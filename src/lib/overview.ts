import { createClient } from '@/lib/supabase/server'

/** "Today" for Technocycle is Philippine time (UTC+8), whatever the server's own time zone. */
function manilaDayBounds(now = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now) // 2026-11-14
  const start = new Date(`${ymd}T00:00:00+08:00`)
  const end = new Date(`${ymd}T23:59:59.999+08:00`)
  return { ymd, start: start.toISOString(), end: end.toISOString() }
}

const OPEN_TICKET_STATUSES = ['open', 'in_progress']
const REQUIRED_201 = ['has_sss_id', 'has_philhealth_id', 'has_pagibig_id', 'has_nbi_clearance', 'has_resume', 'has_medical_clearance'] as const

export interface Overview {
  date: string
  fieldStaff: number
  timedIn: { id: string; name: string; since: string; flagged: boolean }[]
  onLeaveToday: { id: string; name: string; type: string }[]
  flaggedPunchesToday: number
  pendingLeaves: { id: string; name: string; type: string; start: string; end: string; filed: string }[]
  pendingOvertime: number
  openTickets: { id: string; name: string; title: string; category: string; status: string; filed: string }[]
  jobsToday: { id: string; client: string; location: string; start: string; status: string; lead: string; hasLead: boolean; crew: number }[]
  toolsOut: { id: string; tool: string; name: string; qty: number; since: string }[]
  outOfStock: string[]
  incomplete201: number
  recentActivity: { id: string; text: string; who: string; at: string }[]
}

/**
 * Everything the role home pages show, read in one go with the signed-in office user's own access rights.
 */
export async function getOverview(): Promise<Overview> {
  const supabase = await createClient()
  const today = manilaDayBounds()

  const [staff, logs, leavesToday, pendingLeaves, overtime, tickets, jobs, borrowings, tools, activity] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, has_sss_id, has_philhealth_id, has_pagibig_id, has_nbi_clearance, has_resume, has_medical_clearance')
      .in('role', ['technician', 'helper'])
      .eq('lifecycle_status', 'active'),
    supabase
      .from('attendance_logs')
      .select('id, technician_id, app_time_in, app_time_out, is_mocked, is_suspicious, geofence_status')
      .gte('app_time_in', today.start)
      .lte('app_time_in', today.end),
    supabase
      .from('leaves')
      .select('id, technician_id, leave_type')
      .eq('status', 'approved')
      .lte('start_date', today.ymd)
      .gte('end_date', today.ymd),
    supabase
      .from('leaves')
      .select('id, technician_id, leave_type, start_date, end_date, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase.from('overtime_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('tickets')
      .select('id, employee_id, title, category, status, created_at')
      .in('status', OPEN_TICKET_STATUSES)
      .eq('is_archived', false)
      .order('created_at', { ascending: true }),
    supabase
      .from('schedules')
      .select('id, client_name, location, start_time, status, technician_id, schedule_crew(technician_id, status)')
      .gte('start_time', today.start)
      .lte('start_time', today.end)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true }),
    supabase
      .from('tool_borrowings')
      .select('id, quantity, handed_over_at, technician_id, tool:tools(name)')
      .eq('status', 'checked_out')
      .order('handed_over_at', { ascending: true }),
    supabase.from('tools').select('name, available_stock, status').eq('status', 'active'),
    supabase
      .from('activity_logs')
      .select('id, description, created_at, actor:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const people = staff.data || []
  const nameOf = new Map(people.map((p) => [p.id, p.full_name]))
  const name = (id: string | null) => (id && nameOf.get(id)) || 'Former employee'

  const openLogs = (logs.data || []).filter((l) => !l.app_time_out)
  const flagged = (l: { is_mocked: boolean | null; is_suspicious: boolean | null; geofence_status: string | null }) =>
    !!l.is_mocked || !!l.is_suspicious || l.geofence_status === 'outside'

  return {
    date: today.ymd,
    fieldStaff: people.length,
    timedIn: openLogs.map((l) => ({ id: l.id, name: name(l.technician_id), since: l.app_time_in as string, flagged: flagged(l) })),
    onLeaveToday: (leavesToday.data || []).map((l) => ({ id: l.id, name: name(l.technician_id), type: l.leave_type })),
    flaggedPunchesToday: (logs.data || []).filter(flagged).length,
    pendingLeaves: (pendingLeaves.data || []).map((l) => ({
      id: l.id,
      name: name(l.technician_id),
      type: l.leave_type,
      start: l.start_date,
      end: l.end_date,
      filed: l.created_at as string,
    })),
    pendingOvertime: overtime.count || 0,
    openTickets: (tickets.data || []).map((t) => ({
      id: t.id,
      name: name(t.employee_id),
      title: t.title || t.category || 'Request',
      category: t.category || 'General',
      status: t.status || 'open',
      filed: t.created_at as string,
    })),
    jobsToday: (jobs.data || []).map((j) => ({
      id: j.id,
      client: j.client_name,
      location: j.location || '',
      start: j.start_time,
      status: j.status || 'scheduled',
      lead: j.technician_id ? name(j.technician_id) : 'No lead yet',
      hasLead: !!j.technician_id,
      crew: ((j.schedule_crew as { status: string | null }[] | null) || []).filter((c) => c.status === 'active').length,
    })),
    toolsOut: (borrowings.data || []).map((b) => ({
      id: b.id,
      tool: (b.tool as { name: string } | null)?.name || 'Tool',
      name: name(b.technician_id),
      qty: b.quantity || 1,
      since: b.handed_over_at as string,
    })),
    outOfStock: (tools.data || []).filter((t) => (t.available_stock ?? 0) <= 0).map((t) => t.name),
    incomplete201: people.filter((p) => REQUIRED_201.some((k) => !p[k])).length,
    recentActivity: (activity.data || []).map((a) => ({
      id: a.id,
      text: a.description,
      who: (a.actor as { full_name: string } | null)?.full_name || 'System',
      at: a.created_at as string,
    })),
  }
}
