// useTickets: loads tickets and the open ticket's messages, and keeps both live (new messages, typing).
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { SHARED_CHANNEL } from './ticketActions'
import type { PeerTyping, Ticket, TicketMessage } from './types'

const TICKET_SELECT = '*, profiles!tickets_employee_id_fkey(full_name, role), assignee:profiles!tickets_assigned_to_fkey(full_name)'

export function useTickets(selectedId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [typing, setTyping] = useState<PeerTyping | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const selectedRef = useRef(selectedId)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  selectedRef.current = selectedId

  const loadTickets = useCallback(async () => {
    const { data } = await supabase.from('tickets').select(TICKET_SELECT).order('created_at', { ascending: false })
    if (data) setTickets(data as unknown as Ticket[])
    setLoading(false)
  }, [supabase])

  const loadMessages = useCallback(
    async (ticketId: string) => {
      const { data } = await supabase.from('ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true })
      if (data && selectedRef.current === ticketId) setMessages(data as TicketMessage[])
      setLoadingMessages(false)
    },
    [supabase],
  )

  // One live connection: ticket changes, new messages and "is typing" from the mobile app.
  useEffect(() => {
    loadTickets()
    const channel = supabase
      .channel(SHARED_CHANNEL)
      .on('broadcast', { event: 'typing_status' }, ({ payload }) => {
        if (!payload?.ticket_id || payload.role === 'admin') return
        if (typingTimer.current) clearTimeout(typingTimer.current)
        if (!payload.is_typing) return setTyping(null)
        setTyping({ ticketId: payload.ticket_id, role: payload.role || 'technician', userName: payload.user_name || 'Technician' })
        typingTimer.current = setTimeout(() => setTyping(null), 4000)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_comments' }, (change) => {
        loadTickets()
        const ticketId = (change.new as TicketMessage).ticket_id
        if (ticketId && ticketId === selectedRef.current) loadMessages(ticketId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => loadTickets())
      .subscribe()
    channelRef.current = channel
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      supabase.removeChannel(channel)
    }
  }, [supabase, loadTickets, loadMessages])

  // Messages of the open ticket. Also re-checked every few seconds in case a live update is missed.
  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    loadMessages(selectedId)
    const timer = setInterval(() => loadMessages(selectedId), 5000)
    return () => clearInterval(timer)
  }, [selectedId, loadMessages])

  /** Tells the employee's phone that HR is typing (or stopped). */
  const sendTyping = useCallback((ticketId: string, isTyping: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing_status',
      payload: { ticket_id: ticketId, role: 'admin', user_name: 'HR', is_typing: isTyping },
    })
  }, [])

  const addMessage = useCallback((message: TicketMessage) => {
    setMessages((list) => (list.some((m) => m.id === message.id) ? list : [...list, message]))
  }, [])

  return { supabase, tickets, loading, messages, loadingMessages, typing, loadTickets, sendTyping, addMessage }
}
