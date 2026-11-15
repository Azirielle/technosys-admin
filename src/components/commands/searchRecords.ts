// searchRecords: finds people and records for Quick actions as you type ("juan", "vacuum", "Reyes").
// Each result says which page opens it and with which id. Reads go through the signed-in user's access rules.
'use client'

import type { LucideIcon } from 'lucide-react'
import { Box, Briefcase, CalendarDays, FileSpreadsheet, FolderOpen, MessageSquare, ScrollText } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { LEAVE_LABELS } from '@/lib/labels'
import type { AdminRole } from '@/components/dashboard/quickActionList'
import type { CommandDetail } from './pageCommands'

export type RecordResult = {
  id: string
  title: string
  hint: string
  icon: LucideIcon
  target: CommandDetail
}

type Client = SupabaseClient<Database>

const LIMIT = 4

/** Field staff whose name matches. */
async function findPeople(db: Client, q: string) {
  const { data } = await db
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['technician', 'helper'])
    .ilike('full_name', `%${q}%`)
    .order('full_name')
    .limit(LIMIT)
  return data ?? []
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })
}

async function searchHr(db: Client, q: string): Promise<RecordResult[]> {
  const people = await findPeople(db, q)
  const ids = people.map((p) => p.id)
  const nameOf = (id: string) => people.find((p) => p.id === id)?.full_name ?? ''
  const byPerson = ids.length ? `employee_id.in.(${ids.join(',')})` : null

  const [tickets, leaves, policies] = await Promise.all([
    db.from('tickets').select('id, title, status, employee_id, profiles!employee_id(full_name)')
      .or([`title.ilike.%${q}%`, byPerson].filter(Boolean).join(','))
      .order('created_at', { ascending: false }).limit(LIMIT),
    ids.length
      ? db.from('leaves').select('id, leave_type, status, start_date, technician_id').in('technician_id', ids)
          .order('created_at', { ascending: false }).limit(LIMIT)
      : Promise.resolve({ data: [] as { id: string; leave_type: string; status: string; start_date: string; technician_id: string | null }[] }),
    db.from('policies').select('id, title, version').eq('is_active', true).ilike('title', `%${q}%`).limit(3),
  ])

  return [
    ...people.flatMap((p) => [
      { id: `file-${p.id}`, title: `${p.full_name}: 201 file`, hint: 'Documents, status and warnings', icon: FolderOpen, target: { path: '/hr/files', command: 'open' as const, id: p.id } },
      { id: `dtr-${p.id}`, title: `${p.full_name}: DTR`, hint: 'Hours, lates and punches this cut-off', icon: FileSpreadsheet, target: { path: '/hr/audit', command: 'open' as const, id: p.id } },
    ]),
    ...(leaves.data ?? []).map((l) => ({
      id: `leave-${l.id}`,
      title: `${nameOf(l.technician_id ?? '')}: ${LEAVE_LABELS[l.leave_type] ?? l.leave_type}`,
      hint: `Leave from ${shortDate(l.start_date)} · ${l.status === 'rejected' ? 'declined' : l.status}`,
      icon: CalendarDays,
      target: { path: '/hr/leaves', command: 'open' as const, id: l.id },
    })),
    ...(tickets.data ?? []).map((t) => ({
      id: `ticket-${t.id}`,
      title: t.title,
      hint: `Ticket from ${(t.profiles as { full_name?: string } | null)?.full_name ?? 'employee'} · ${t.status.replace('_', ' ')}`,
      icon: MessageSquare,
      target: { path: '/hr/tickets', command: 'open' as const, id: t.id },
    })),
    ...(policies.data ?? []).map((p) => ({
      id: `policy-${p.id}`, title: p.title, hint: `Policy ${p.version}`, icon: ScrollText,
      target: { path: '/hr/policies', command: 'open' as const, id: p.id },
    })),
  ]
}

async function searchCoordinator(db: Client, q: string): Promise<RecordResult[]> {
  const people = await findPeople(db, q)
  const byLead = people.length ? `technician_id.in.(${people.map((p) => p.id).join(',')})` : null
  const since = new Date(Date.now() - 14 * 86400000).toISOString()

  const [tools, jobs] = await Promise.all([
    db.from('tools').select('id, name, available_stock, total_stock').ilike('name', `%${q}%`).order('name').limit(LIMIT),
    db.from('schedules').select('id, client_name, project_name, location, start_time, status, profiles!technician_id(full_name)')
      .or([`client_name.ilike.%${q}%`, `location.ilike.%${q}%`, `project_name.ilike.%${q}%`, byLead].filter(Boolean).join(','))
      .gte('start_time', since).neq('status', 'cancelled').order('start_time').limit(LIMIT + 2),
  ])

  return [
    ...(jobs.data ?? []).map((j) => ({
      id: `job-${j.id}`,
      title: j.project_name || j.client_name,
      hint: `Job ${shortDate(j.start_time)} · ${(j.profiles as { full_name?: string } | null)?.full_name ?? 'no lead yet'} · ${j.location}`,
      icon: Briefcase,
      target: { path: '/coordinator/dispatch', command: 'open' as const, id: j.id, date: j.start_time },
    })),
    ...(tools.data ?? []).map((t) => ({
      id: `tool-${t.id}`,
      title: `Lend ${t.name}`,
      hint: `${t.available_stock ?? 0} of ${t.total_stock ?? 0} in the warehouse`,
      icon: Box,
      target: { path: '/coordinator/inventory', command: 'lend' as const, id: t.id },
    })),
  ]
}

async function searchCeo(db: Client, q: string): Promise<RecordResult[]> {
  const { data } = await db.from('policies').select('id, title, version, status').neq('status', 'archived').ilike('title', `%${q}%`).limit(LIMIT)
  return (data ?? []).map((p) => ({
    id: `policy-${p.id}`, title: p.title, hint: `Policy ${p.version}`, icon: ScrollText,
    target: { path: '/ceo/policies', command: 'open' as const, id: p.id },
  }))
}

/** Records matching the words typed, for this role. Needs at least 2 letters. */
export async function searchRecords(db: Client, role: AdminRole, query: string): Promise<RecordResult[]> {
  // Commas, dots and brackets would break the search filter; letters, numbers and spaces are enough here.
  const q = query.trim().replace(/[^\p{L}\p{N} -]/gu, '')
  if (q.length < 2) return []
  if (role === 'hr') return searchHr(db, q)
  if (role === 'coordinator') return searchCoordinator(db, q)
  return searchCeo(db, q)
}
