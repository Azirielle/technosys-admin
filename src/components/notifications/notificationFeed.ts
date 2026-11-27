// notificationFeed: collects the recent things each role should hear about (data only, no screens).
import type { SupabaseClient } from '@supabase/supabase-js'

export type FeedRole = 'ceo' | 'hr' | 'coordinator'
export type FeedItem = { id: string; kind: 'ticket' | 'leave' | 'tool' | 'face'; title: string; body: string; at: string; href: string | null }

const DAYS = 14
const OPEN = ['open', 'in_progress']

const day = (d: string) =>
  new Date(`${d}T00:00:00+08:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })

// A failed query gives no rows, so one broken table never hides the rest.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rows(q: PromiseLike<{ data: unknown }>): Promise<any[]> {
  try {
    const { data } = await q
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function loadFeed(supabase: SupabaseClient, role: FeedRole): Promise<FeedItem[]> {
  const since = new Date(Date.now() - DAYS * 86400000).toISOString()
  const none = Promise.resolve({ data: [] as unknown })
  const t = () => supabase.from('tickets')

  const [profiles, tickets, leaves, tools, faces] = await Promise.all([
    rows(supabase.from('profiles').select('id, full_name')),
    role !== 'coordinator'
      ? rows(t().select('id, employee_id, title, priority, created_at').in('priority', ['high', 'urgent']).neq('title', 'Support Conversation').in('status', OPEN).gte('created_at', since))
      : rows(none),
    role !== 'coordinator'
      ? rows(supabase.from('leaves').select('id, technician_id, leave_type, start_date, end_date, created_at').eq('status', 'pending').gte('created_at', since))
      : rows(none),
    role !== 'hr'
      ? rows(t().select('id, employee_id, title, created_at').eq('category', 'Tool request').in('status', OPEN).gte('created_at', since))
      : rows(none),
    rows(supabase.from('reviews').select('id, created_at, status, note, work_day:work_days ( person_id, work_date )').eq('kind', 'face_mismatch').gte('created_at', since)),
  ])

  const names = new Map<string, string>(profiles.map((p) => [p.id, p.full_name]))
  const who = (id?: string | null) => (id && names.get(id)) || 'Someone'
  const items: FeedItem[] = []

  for (const k of tickets) {
    items.push({
      id: 'ticket-' + k.id,
      kind: 'ticket',
      title: k.priority === 'urgent' ? 'Urgent ticket' : 'High-priority ticket',
      body: `${who(k.employee_id)}: ${k.title}`,
      at: k.created_at,
      href: role === 'hr' ? '/hr/tickets' : null,
    })
  }
  for (const l of leaves) {
    items.push({
      id: 'leave-' + l.id,
      kind: 'leave',
      title: 'Leave request',
      body: `${who(l.technician_id)}: ${l.leave_type} leave, ${day(l.start_date)} to ${day(l.end_date)}`,
      at: l.created_at,
      href: role === 'hr' ? '/hr/leaves' : null,
    })
  }
  for (const k of tools) {
    items.push({
      id: 'tool-' + k.id,
      kind: 'tool',
      title: 'Tool request',
      body: `${who(k.employee_id)}: ${String(k.title ?? '').replace(/^Tool request: /, '')}`,
      at: k.created_at,
      href: role === 'coordinator' ? '/coordinator/inventory?tab=requests' : null,
    })
  }
  for (const r of faces) {
    const wd = Array.isArray(r.work_day) ? r.work_day[0] : r.work_day
    items.push({
      id: 'face-' + r.id,
      kind: 'face',
      title: 'Face mismatch',
      body: `${who(wd?.person_id)}: time-in on ${wd?.work_date ? day(wd.work_date) : 'an unknown day'}${r.status !== 'pending' ? ' · checked' : ''}`,
      at: r.created_at,
      href: role === 'coordinator' ? '/coordinator/today?view=approvals' : null,
    })
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30)
}
