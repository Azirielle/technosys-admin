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

export function isFinished(ticket: Ticket) {
  return ticket.status === 'resolved' || ticket.status === 'closed'
}

/** HR has to act: a new ticket, or one HR took over from the AI that is still open. */
export function needsAttention(ticket: Ticket) {
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
  if (t.title === 'Support Conversation' && t.handling_mode !== 'ADMIN') return false
  const last = t.ticket_comments.filter((c) => !c.is_internal).sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')).at(-1)
  return !last || last.sender_role === 'technician'
}
