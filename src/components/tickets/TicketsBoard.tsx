// TicketsBoard: the HR Tickets page. Ticket list on the left, the open conversation on the right.
'use client'

import { useMemo, useRef, useState } from 'react'
import { usePageCommand } from '@/components/commands/pageCommands'
import { Search, X } from 'lucide-react'
import { IconButton, Input, PageHeader, Tabs, cx, useToast } from '@/components/ui'
import { TicketList } from './TicketList'
import { TicketThread } from './TicketThread'
import { TicketFinishModal } from './TicketFinishModal'
import { finishTicket, sendReply, takeOverTicket } from './ticketActions'
import { useTickets } from './useTickets'
import { employeeName, matchesFilter, needsAttention, type TicketFilter } from './types'

const EMPTY_TEXT: Record<TicketFilter, string> = {
  needs_attention: 'Nothing is waiting for HR right now.',
  in_progress: 'No conversations are going on.',
  done: 'No resolved or closed tickets yet.',
  all: 'Technicians file tickets from the mobile app. They show up here.',
}

export function TicketsBoard() {
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { supabase, tickets, loading, messages, loadingMessages, typing, loadTickets, sendTyping, addMessage } = useTickets(selectedId)
  const [filter, setFilter] = useState<TicketFilter>('needs_attention')
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [internal, setInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [takingOver, setTakingOver] = useState(false)
  const [finishing, setFinishing] = useState<'resolved' | 'closed' | null>(null)
  const [savingFinish, setSavingFinish] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Quick actions: open a ticket by id (shown under "All" so it's in the list whatever its status).
  usePageCommand(['open'], (_command, id) => {
    if (!id) return
    setFilter('all')
    openTicket(id)
  })

  const selected = tickets.find((t) => t.id === selectedId) ?? null
  const parentIdsWithChildren = useMemo(() => new Set(tickets.map((t) => t.from_ticket_id).filter(Boolean)), [tickets])
  const visible = useMemo(() => tickets.filter((t) => !parentIdsWithChildren.has(t.id)), [tickets, parentIdsWithChildren])
  const counts = useMemo(
    () => ({
      needs_attention: visible.filter(needsAttention).length,
      in_progress: visible.filter((t) => matchesFilter(t, 'in_progress')).length,
      done: visible.filter((t) => matchesFilter(t, 'done')).length,
    }),
    [visible],
  )
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visible.filter(
      (t) => matchesFilter(t, filter) && (!q || [t.title, t.category, employeeName(t)].some((s) => s.toLowerCase().includes(q))),
    )
  }, [visible, filter, search])

  function openTicket(id: string) {
    setSelectedId(id)
    setReply('')
    setFile(null)
    setInternal(false)
  }

  function changeReply(text: string) {
    setReply(text)
    // Don't show the employee "HR is typing…" while HR writes a note they'll never see.
    if (!selectedId || internal) return
    sendTyping(selectedId, true)
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current)
    stopTypingTimer.current = setTimeout(() => sendTyping(selectedId, false), 2500)
  }

  async function send() {
    if (!selected) return
    setSending(true)
    sendTyping(selected.id, false)
    try {
      // Replying to a chat Techy still answers = taking it over: Techy stops and the phone shows "HR is answering"
      if (!internal && selected.handling_mode !== 'ADMIN') await takeOverTicket(supabase, selected)
      const saved = await sendReply(supabase, selected, reply, file, internal)
      if (saved) addMessage(saved)
      setReply('')
      setFile(null)
    } catch (err) {
      toast.error(`Couldn't send your reply: ${(err as Error).message}`)
    } finally {
      setSending(false)
    }
  }

  async function takeOver() {
    if (!selected) return
    setTakingOver(true)
    try {
      await takeOverTicket(supabase, selected)
      toast.success('You are now answering this ticket. The AI has stopped.')
      loadTickets()
    } catch (err) {
      toast.error(`Couldn't take over: ${(err as Error).message}`)
    } finally {
      setTakingOver(false)
    }
  }

  async function finish(note: string) {
    if (!selected || !finishing) return
    setSavingFinish(true)
    try {
      const result = await finishTicket(supabase, selected, finishing, note)
      if (result.alreadyDone) toast.show(`Someone already marked this ticket ${result.status}.`)
      else toast.success(finishing === 'resolved' ? 'Ticket resolved' : 'Ticket closed')
      setFinishing(null)
      loadTickets()
    } catch (err) {
      toast.error(`Couldn't save: ${(err as Error).message}`)
    } finally {
      setSavingFinish(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-section px-page py-page-y">
      <PageHeader title="Tickets" subtitle="Concerns and requests from technicians. The AI answers first; HR makes every decision." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Ticket status"
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'needs_attention', label: 'Needs HR', count: counts.needs_attention },
            { value: 'in_progress', label: 'In progress', count: counts.in_progress },
            { value: 'done', label: 'Done', count: counts.done },
            { value: 'all', label: 'All', count: tickets.length },
          ]}
        />
        <Input icon={Search} className="w-full sm:w-72" placeholder="Search name, subject or type" aria-label="Search tickets" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex min-h-0 flex-1 gap-section">
        <section aria-label="Tickets" className={cx('w-full shrink-0 overflow-y-auto rounded-card bg-surface shadow-card md:block md:w-[360px] lg:w-[400px]', selected && 'hidden')}>
          <TicketList tickets={shown} loading={loading} selectedId={selectedId} emptyText={EMPTY_TEXT[filter]} onSelect={(t) => openTicket(t.id)} />
        </section>
        <section aria-label="Conversation" className={cx('min-w-0 flex-1 overflow-hidden rounded-card bg-surface shadow-card md:block', !selected && 'hidden')}>
          <TicketThread
            ticket={selected}
            messages={messages}
            loadingMessages={loadingMessages}
            typing={typing}
            reply={reply}
            file={file}
            sending={sending}
            internal={internal}
            takingOver={takingOver}
            onReplyChange={changeReply}
            onFileChange={setFile}
            onInternalChange={(on) => {
              setInternal(on)
              if (on && selectedId) sendTyping(selectedId, false)
            }}
            onSend={send}
            onTakeOver={takeOver}
            onFinish={setFinishing}
            onOpenImage={setLightbox}
            onBack={() => setSelectedId(null)}
          />
        </section>
      </div>

      <TicketFinishModal ticket={selected} outcome={finishing} saving={savingFinish} onCancel={() => setFinishing(null)} onConfirm={finish} />

      {lightbox && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-scrim p-6" onClick={() => setLightbox(null)}>
          <IconButton icon={X} label="Close photo" variant="secondary" className="absolute top-5 right-5" onClick={() => setLightbox(null)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Attached photo, larger" className="max-h-[85vh] max-w-full rounded-card object-contain shadow-overlay" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
