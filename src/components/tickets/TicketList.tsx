// TicketList: the left column of the Tickets page, one row per ticket. Click a row to open it.
'use client'

import { TicketRowSkeleton } from '@/components/loading/PageSkeletons'
import { Bot, MessageSquare, UserRound } from 'lucide-react'
import { formatTimeAgo } from '@/lib/hr-status'
import { Avatar, Badge, EmptyState, cx, SkeletonArea } from '@/components/ui'
import { aiAnswering, employeeName, ticketPriority, ticketRef, ticketStatus, type Ticket } from './types'

export function TicketList({
  tickets,
  loading,
  selectedId,
  emptyText,
  onSelect,
}: {
  tickets: Ticket[]
  loading: boolean
  selectedId: string | null
  emptyText: string
  onSelect: (ticket: Ticket) => void
}) {
  if (loading)
    return (
      <SkeletonArea label="Loading tickets" className="flex flex-col gap-4 p-card">
        {Array.from({ length: 5 }, (_, i) => <TicketRowSkeleton key={i} />)}
      </SkeletonArea>
    )
  if (tickets.length === 0) return <EmptyState icon={MessageSquare} title="No tickets here" description={emptyText} />

  return (
    <ul className="flex flex-col gap-1 p-2">
      {tickets.map((ticket) => {
        const status = ticketStatus(ticket.status)
        const selected = ticket.id === selectedId
        return (
          <li key={ticket.id}>
            <button
              type="button"
              data-nav-row
              onClick={() => onSelect(ticket)}
              aria-current={selected || undefined}
              className={cx(
                'flex w-full cursor-pointer items-start gap-3 rounded-control p-3 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-focus',
                selected ? 'bg-surface-soft' : 'hover:bg-surface-hover',
              )}
            >
              <Avatar name={employeeName(ticket)} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="line-clamp-1 text-small font-medium text-ink">{ticket.title}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Badge tone={ticketPriority(ticket.priority).tone}>{ticketPriority(ticket.priority).label}</Badge>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-caption text-ink-2">
                  <span className="truncate"><span className="font-mono text-ink-3">{ticketRef(ticket)}</span> · {employeeName(ticket)} · {ticket.category}</span>
                  <span className="shrink-0 text-ink-3">{formatTimeAgo(ticket.created_at)}</span>
                </span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-micro font-medium text-ink-3">
                  {aiAnswering(ticket) ? (
                    <><Bot className="size-3" aria-hidden /> AI is answering</>
                  ) : ticket.handling_mode === 'ADMIN' ? (
                    <><UserRound className="size-3" aria-hidden /> HR is answering</>
                  ) : (
                    <><UserRound className="size-3" aria-hidden /> Waiting for HR</>
                  )}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
