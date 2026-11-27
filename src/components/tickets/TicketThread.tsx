// TicketThread: the right side of the Tickets page — ticket title, actions, the conversation and the reply box.
'use client'

import { ConversationSkeleton } from '@/components/loading/PageSkeletons'
import { useEffect, useRef } from 'react'
import { ArrowLeft, Check, MessageSquare, UserRound, X } from 'lucide-react'
import { Badge, Button, EmptyState, IconButton, Select } from '@/components/ui'
import { ChatMessage, TypingBubble } from './ChatMessage'
import { ReplyBox } from './ReplyBox'
import { ConcernCard } from './ConcernCard'
import { TICKET_PRIORITIES, aiAnswering, employeeName, isFinished, kindOf, ticketStatus, type PeerTyping, type Ticket, type TicketMessage } from './types'

/** The mobile app saves this text when a chat starts with the AI and has no real description. */
const AI_CHAT_PLACEHOLDER = 'User initiated an AI support chat.'

export function TicketThread({
  ticket,
  messages,
  loadingMessages,
  typing,
  reply,
  file,
  sending,
  internal,
  takingOver,
  onReplyChange,
  onFileChange,
  onInternalChange,
  onSend,
  onTakeOver,
  onFinish,
  onPriority,
  onOpenImage,
  onReload,
  onBack,
}: {
  ticket: Ticket | null
  messages: TicketMessage[]
  loadingMessages: boolean
  typing: PeerTyping | null
  reply: string
  file: File | null
  sending: boolean
  internal: boolean
  takingOver: boolean
  onReplyChange: (text: string) => void
  onFileChange: (file: File | null) => void
  onInternalChange: (internal: boolean) => void
  onSend: () => void
  onTakeOver: () => void
  onFinish: (outcome: 'resolved' | 'closed') => void
  onPriority: (priority: string) => void
  onOpenImage: (url: string) => void
  /** After HR fixed a DTR from the concern card: reload the tickets */
  onReload: () => void
  /** Small screens only: back to the ticket list. */
  onBack: () => void
}) {
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typing])

  if (!ticket) {
    return <EmptyState icon={MessageSquare} title="Pick a ticket" description="Choose a ticket on the left to read the conversation and reply." className="h-full" />
  }

  const status = ticketStatus(ticket.status)
  const name = employeeName(ticket)
  const finished = isFinished(ticket)
  const showDescription = ticket.description && ticket.description !== AI_CHAT_PLACEHOLDER
  const isConcern = kindOf(ticket) !== 'chat'

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-card py-4">
        <div className="flex min-w-0 items-start gap-2">
          <IconButton icon={ArrowLeft} label="Back to tickets" size="sm" className="md:hidden" onClick={onBack} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-caption text-ink-3">
              <span>{ticket.category}</span>
              <span>·</span>
              <span>from {name}</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-heading font-semibold text-ink">{ticket.title}</h2>
              <Badge tone={status.tone} dot>{status.label}</Badge>
              {/* Priority: the technician picks it when filing; HR can change it */}
              <Select size="sm" aria-label="Priority" className="w-28" value={(ticket.priority ?? 'medium').toLowerCase()} disabled={finished}
                onChange={(e) => onPriority(e.target.value)} options={TICKET_PRIORITIES} />
            </div>
          </div>
        </div>
        {!finished && (
          <div className="flex shrink-0 flex-wrap gap-inline">
            {aiAnswering(ticket) && ( // a concern needs no take-over: replying already does it
              <Button size="sm" icon={UserRound} onClick={onTakeOver} loading={takingOver}>Answer as HR</Button>
            )}
            <Button size="sm" variant="ghost" icon={X} onClick={() => onFinish('closed')}>Close</Button>
            <Button size="sm" variant="primary" icon={Check} onClick={() => onFinish('resolved')}>Mark resolved</Button>
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-card py-4">
        {/* A concern (DTR, tools, others) opens with its card: what they say, their photo, the record, HR's decision */}
        {isConcern && <ConcernCard ticket={ticket} onOpenImage={onOpenImage} onFinish={onFinish} onDone={onReload} />}
        {!isConcern && showDescription && (
          <div className="rounded-control border border-line p-3">
            <p className="text-micro font-medium text-ink-3">What {name} wrote</p>
            <p className="mt-1 whitespace-pre-wrap text-small text-ink">{ticket.description}</p>
          </div>
        )}
        {loadingMessages && messages.length === 0 ? (
          <ConversationSkeleton />
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} employeeName={name} onOpenImage={onOpenImage} />)
        )}
        {typing?.ticketId === ticket.id && <TypingBubble name={typing.role === 'ai' ? 'AI assistant' : name} />}
        <div ref={bottom} />
      </div>

      {finished ? (
        <p className="border-t border-line px-card py-3 text-center text-caption text-ink-3">
          This ticket is {status.label.toLowerCase()}. The employee can open a new one from the app.
        </p>
      ) : (
        <ReplyBox
          text={reply}
          file={file}
          sending={sending}
          internal={internal}
          employeeName={name}
          onTextChange={onReplyChange}
          onFileChange={onFileChange}
          onInternalChange={onInternalChange}
          onSend={onSend}
        />
      )}
    </div>
  )
}
