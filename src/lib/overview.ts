import { createClient } from '@/lib/supabase/server'
import { waitingForHr } from '@/components/tickets/types'

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
  /** waiting: HR owes the next reply (see waitingForHr) */
  openTickets: { id: string; name: string; title: string; category: string; status: string; filed: string; waiting: boolean }[]
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
    supabase.from('work_days').select('id, person_id, time_in, time_out, is_mocked, in_check').eq('work_date', today.ymd),
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
      .select('id, employee_id, title, category, status, created_at, handling_mode, ticket_comments ( sender_role, is_internal, created_at )')
      .in('status', OPEN_TICKET_STATUSES)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }), // newest first (lists); the oldest is the last one
    supabase
      .from('jobs')
      .select('id, client_name, address, start_time, status, job_members(person_id, role, is_acting_lead, removed_at)')
      .lte('start_date', today.ymd)
      .gte('end_date', today.ymd)
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

  const openLogs = (logs.data || []).filter((l) => !l.time_out)
  // Flagged = fake GPS or a selfie time-in (outside the place)
  const flagged = (l: { is_mocked: boolean | null; in_check: string | null }) => !!l.is_mocked || l.in_check === 'selfie'
  type Member = { person_id: string | null; role: string; is_acting_lead: boolean; removed_at: string | null }
  const membersOf = (j: { job_members: unknown }) => ((j.job_members as Member[] | null) || []).filter((m) => !m.removed_at)
  const leadOf = (j: { job_members: unknown }) =>
    membersOf(j).find((m) => m.is_acting_lead)?.person_id ?? membersOf(j).find((m) => m.role === 'lead')?.person_id ?? null

  return {
    date: today.ymd,
    fieldStaff: people.length,
    timedIn: openLogs.map((l) => ({ id: l.id, name: name(l.person_id), since: l.time_in as string, flagged: flagged(l) })),
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
      waiting: waitingForHr(t),
    })),
    jobsToday: (jobs.data || []).map((j) => ({
      id: j.id,
      client: j.client_name,
      location: j.address || '',
      start: new Date(`${today.ymd}T${j.start_time.slice(0, 8)}+08:00`).toISOString(),
      status: j.status || 'scheduled',
      lead: leadOf(j) ? name(leadOf(j)) : 'No lead yet',
      hasLead: !!leadOf(j),
      crew: membersOf(j).filter((m) => m.person_id !== leadOf(j)).length,
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
