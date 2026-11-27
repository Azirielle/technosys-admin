// Types and small helpers for the HR Tickets page (one ticket, one message, status labels).
import type { Tone } from '@/components/ui'

export type Ticket = {
  id: string
  employee_id: string
  title: string
  category: string
  description: string
  status: string
  priority: string
  handling_mode: string | null
  attachment_url?: string | null
  attachment_type?: string | null
  created_at: string
  profiles?: { full_name: string; role?: string }
  assignee?: { full_name: string } | null
}

export type TicketMessage = {
  id: string
  ticket_id: string
  author_id: string
  content: string
  attachment_url?: string | null
  attachment_type?: string | null
  created_at: string
  sender_role: string
  is_internal?: boolean | null
}

export type TicketFilter = 'needs_attention' | 'in_progress' | 'done' | 'all'

/** Someone typing in a ticket chat (from the mobile app or the AI). */
export type PeerTyping = { ticketId: string; role: 'technician' | 'ai' | 'admin'; userName: string }

const STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: 'New', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
}

export function ticketStatus(status: string) {
  return STATUS[status] ?? STATUS.open
}

const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  urgent: { label: 'Urgent', tone: 'danger' },
  high: { label: 'High', tone: 'warning' },
  medium: { label: 'Medium', tone: 'info' },
  low: { label: 'Low', tone: 'neutral' },
}

/** Choices HR can set (the technician picks one when filing) */
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'].map((value) => ({ value, label: PRIORITY[value].label }))

export function ticketPriority(priority?: string | null) {
  const p = (priority ?? 'medium').toLowerCase()
  return PRIORITY[p] ?? PRIORITY.medium
}

export function isFinished(ticket: Ticket) {
  return ticket.status === 'resolved' || ticket.status === 'closed'
}

/** Techy (the AI) is answering: only an open Techy chat HR hasn't taken over. A concern (DTR, tools, others) never is. */
export const aiAnswering = (t: { title: string | null; handling_mode: string | null }) => t.title === 'Support Conversation' && t.handling_mode !== 'ADMIN'

/** HR has to act: a new concern, or one HR took over that is still open. Not a Techy chat Techy is answering. */
export function needsAttention(ticket: Ticket) {
  if (aiAnswering(ticket)) return false
  return ticket.status === 'open' || (ticket.status === 'in_progress' && ticket.handling_mode === 'ADMIN')
}

export function employeeName(ticket: Ticket) {
  return ticket.profiles?.full_name || 'Employee'
}

/** Short reference shown to people, e.g. "#3F2A91C0". */
export function ticketRef(ticket: Ticket) {
  return `#${ticket.id.slice(0, 8).toUpperCase()}`
}

export function isImage(url?: string | null, type?: string | null) {
  if (!url) return false
  if (type?.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif)$/i.test(url.split('?')[0])
}

/** The kind of concern, from the category the phone saved (DTR, tools, other reports, or a plain Techy chat). */
export type TicketKind = 'all' | 'dtr' | 'tools' | 'others' | 'chat'
export const TICKET_KINDS: { value: TicketKind; label: string }[] = [
  { value: 'all', label: 'All types' }, { value: 'dtr', label: 'DTR' }, { value: 'tools', label: 'Tools' },
  { value: 'others', label: 'Others (accident, vehicle…)' }, { value: 'chat', label: 'Techy chats' },
]
export function kindOf(ticket: Pick<Ticket, 'category' | 'title'>): Exclude<TicketKind, 'all'> {
  if (ticket.title?.startsWith('Support Conversation')) return 'chat'
  if (/dtr/i.test(ticket.category)) return 'dtr'
  if (/equipment|tool/i.test(ticket.category)) return 'tools'
  return 'others'
}

export function matchesFilter(ticket: Ticket, filter: TicketFilter) {
  if (filter === 'needs_attention') return needsAttention(ticket)
  if (filter === 'in_progress') return ticket.status === 'in_progress'
  if (filter === 'done') return isFinished(ticket)
  return true
}

type TicketRow = { title: string | null; handling_mode: string | null; ticket_comments: { sender_role: string | null; is_internal: boolean | null; created_at: string | null }[] }
/** HR owes the next reply: nobody has answered yet, or the technician wrote last. A Techy chat HR hasn't taken over
 *  doesn't count: Techy is answering it (technicians often just ask Techy how the app works). */
export function waitingForHr(t: TicketRow): boolean {
  if (aiAnswering(t)) return false
  const last = t.ticket_comments.filter((c) => !c.is_internal).sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')).at(-1)
  return !last || last.sender_role === 'technician'
}
