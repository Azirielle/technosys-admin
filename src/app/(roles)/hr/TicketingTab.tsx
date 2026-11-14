'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  MessageSquare,
  Bot,
  User,
  Clock,
  AlertTriangle,
  Send,
  X,
  ShieldAlert,
  Archive,
  CheckCircle2,
  XCircle,
  Paperclip,
  FileText,
  ZoomIn,
  ExternalLink,
  Loader2,
  ChevronRight,
  Filter,
} from 'lucide-react'
import {
  getTicketStatusInfo,
  formatTimeAgo,
} from '@/lib/hr-status'

type Ticket = {
  id: string
  employee_id: string
  title: string
  category: string
  description: string
  status: string
  priority: string
  handling_mode: string
  admin_summary: string
  attachment_url?: string | null
  attachment_type?: string | null
  is_archived?: boolean
  assignee?: { full_name: string }
  created_at: string
  profiles?: { full_name: string; role?: string }
}

type Comment = {
  id: string
  ticket_id: string
  author_id: string
  content: string
  attachment_url?: string | null
  attachment_type?: string | null
  created_at: string
  sender_role: string
  is_internal: boolean
}

function KineticTypingBubble({
  role = 'technician',
  userName = 'Technician',
}: {
  role?: 'technician' | 'admin' | 'ai'
  userName?: string
}) {
  const isAi = role === 'ai'
  return (
    <div
      className="flex items-start gap-2.5 my-2 animate-in fade-in-50 duration-150"
      role="status"
      aria-live="polite"
      aria-label={isAi ? 'AI Assistant is thinking' : `${userName} is typing`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
          isAi
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-[#4D55CC]/10 border-[#4D55CC]/30 text-[#4D55CC]'
        }`}
      >
        {isAi ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
      </div>
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl rounded-tl-xs bg-[#F5F4F7] dark:bg-[#282935] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                  isAi ? 'bg-emerald-500' : 'bg-[#4D55CC]'
                }`}
                style={{
                  animationDuration: '1.2s',
                  animationDelay: `${i * 0.16}s`,
                  animationTimingFunction: 'ease-in-out',
                }}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-[#7A7C88] dark:text-[#9A9BA6] select-none">
            {isAi ? 'AI Assistant is typing...' : `${userName} is typing...`}
          </span>
        </div>
      </div>
    </div>
  )
}

export function TicketingTab() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'needs_attention' | 'all' | 'in_progress' | 'resolved'>('needs_attention')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [attachedAdminFile, setAttachedAdminFile] = useState<{
    file: File
    preview: string
    name: string
    type: string
  } | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null)
  const [decisionModal, setDecisionModal] = useState<{
    type: 'resolve' | 'refuse' | null
    title: string
    remarks: string
  }>({ type: null, title: '', remarks: '' })

  // Peer typing indicator state
  const [peerTyping, setPeerTyping] = useState<{
    isTyping: boolean
    role: 'technician' | 'admin' | 'ai'
    userName: string
    ticketId: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const adminTypingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const peerWatchdogRef = useRef<NodeJS.Timeout | null>(null)
  const selectedTicketRef = useRef<Ticket | null>(null)
  const systemChannelRef = useRef<any>(null)

  selectedTicketRef.current = selectedTicket
  const supabase = createClient()

  useEffect(() => {
    fetchTickets()

    // Persistent Realtime channel for cross-client typing and events
    const channel = supabase
      .channel('hr-ticketing-realtime')
      .on('broadcast', { event: 'typing_status' }, ({ payload }) => {
        const data = payload as any
        if (!data || !data.ticket_id) return
        if (data.role === 'admin') return

        if (data.is_typing) {
          setPeerTyping({
            isTyping: true,
            role: data.role || 'technician',
            userName: data.user_name || 'Technician',
            ticketId: data.ticket_id,
          })
          if (peerWatchdogRef.current) clearTimeout(peerWatchdogRef.current)
          peerWatchdogRef.current = setTimeout(() => {
            setPeerTyping(null)
          }, 4000)
        } else {
          setPeerTyping((prev) => (prev?.ticketId === data.ticket_id ? null : prev))
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_comments' },
        (payload) => {
          const inserted = payload.new as any
          fetchTickets(true)
          if (selectedTicketRef.current && inserted?.ticket_id === selectedTicketRef.current.id) {
            fetchComments(selectedTicketRef.current.id, true)
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets(true)
      })
      .subscribe()

    systemChannelRef.current = channel

    return () => {
      if (adminTypingTimerRef.current) clearTimeout(adminTypingTimerRef.current)
      if (peerWatchdogRef.current) clearTimeout(peerWatchdogRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (selectedTicket) {
      fetchComments(selectedTicket.id)
      const interval = setInterval(() => {
        if (selectedTicketRef.current?.id) {
          fetchComments(selectedTicketRef.current.id, true)
        }
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [selectedTicket?.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await supabase
        .from('tickets')
        .select(
          '*, profiles!tickets_employee_id_fkey(full_name, role), assignee:profiles!tickets_assigned_to_fkey(full_name)'
        )
        .order('created_at', { ascending: false })

      if (data) setTickets(data as any)
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchComments = async (ticketId: string, silent = false) => {
    if (!silent) setLoadingComments(true)
    try {
      const { data } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (data) setComments(data as Comment[])
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      if (!silent) setLoadingComments(false)
    }
  }

  const handleTakeOver = async () => {
    if (!selectedTicket) return

    await supabase
      .from('tickets')
      .update({ handling_mode: 'ADMIN', status: 'in_progress' })
      .eq('id', selectedTicket.id)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase.from('ticket_comments').insert({
      ticket_id: selectedTicket.id,
      content: 'An HR Administrator has taken over the chat. The AI assistant has been disabled.',
      sender_role: 'system',
      author_id: user?.id as string,
    })

    await supabase.channel('system-updates').send({
      type: 'broadcast',
      event: 'new_comment',
      payload: { ticket_id: selectedTicket.id },
    })
    await supabase.channel('system-updates').send({
      type: 'broadcast',
      event: 'ticket_update',
      payload: {},
    })

    setSelectedTicket({ ...selectedTicket, handling_mode: 'ADMIN', status: 'in_progress' })
    fetchTickets(true)
  }

  const isImageAttachment = (url?: string | null, type?: string | null) => {
    if (!url) return false
    if (type?.startsWith('image/')) return true
    const cleanUrl = url.toLowerCase().split('?')[0]
    return (
      cleanUrl.endsWith('.png') ||
      cleanUrl.endsWith('.jpg') ||
      cleanUrl.endsWith('.jpeg') ||
      cleanUrl.endsWith('.webp') ||
      cleanUrl.endsWith('.gif')
    )
  }

  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.docx', '.doc', '.xlsx', '.xls']

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext)
    const isMimeValid = file.type ? file.type.startsWith('image/') || file.type.includes('pdf') || file.type.includes('word') || file.type.includes('excel') : isExtValid

    if (!isExtValid && !isMimeValid) {
      alert('Unsupported file type. Supported: Images (PNG, JPG), PDF, Word (.docx), Excel (.xlsx).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Attachment size cannot exceed 5MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    setAttachedAdminFile({
      file,
      preview,
      name: file.name,
      type: file.type || 'application/octet-stream',
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAdminInputChange = (val: string) => {
    setNewComment(val)
    if (!selectedTicket?.id || !systemChannelRef.current) return

    systemChannelRef.current.send({
      type: 'broadcast',
      event: 'typing_status',
      payload: {
        ticket_id: selectedTicket.id,
        role: 'admin',
        user_name: 'HR Admin',
        is_typing: true,
      },
    })

    if (adminTypingTimerRef.current) clearTimeout(adminTypingTimerRef.current)
    adminTypingTimerRef.current = setTimeout(() => {
      systemChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing_status',
        payload: {
          ticket_id: selectedTicket.id,
          role: 'admin',
          user_name: 'HR Admin',
          is_typing: false,
        },
      })
    }, 2500)
  }

  const handleSendMessage = async () => {
    if ((!newComment.trim() && !attachedAdminFile) || !selectedTicket || uploadingAttachment) return

    if (adminTypingTimerRef.current) clearTimeout(adminTypingTimerRef.current)
    systemChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing_status',
      payload: {
        ticket_id: selectedTicket.id,
        role: 'admin',
        user_name: 'HR Admin',
        is_typing: false,
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let uploadedUrl: string | null = null
    let uploadedType: string | null = null

    if (attachedAdminFile) {
      setUploadingAttachment(true)
      const sanitizedName = attachedAdminFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `admin_${user?.id || 'staff'}/${Date.now()}_${sanitizedName}`

      const { error: uploadError } = await supabase.storage
        .from('ticket_attachments')
        .upload(filePath, attachedAdminFile.file, {
          contentType: attachedAdminFile.type,
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('ticket_attachments')
          .getPublicUrl(filePath)
        uploadedUrl = urlData.publicUrl
        uploadedType = attachedAdminFile.type
      } else {
        alert('Failed to upload attachment: ' + uploadError.message)
        setUploadingAttachment(false)
        return
      }
      setUploadingAttachment(false)
    }

    const commentContent = newComment.trim() || (attachedAdminFile ? `Attached: ${attachedAdminFile.name}` : '')

    const commentData = {
      ticket_id: selectedTicket.id,
      author_id: user?.id as string,
      content: commentContent,
      sender_role: 'admin',
      attachment_url: uploadedUrl,
      attachment_type: uploadedType,
    }

    setNewComment('')
    setAttachedAdminFile(null)

    const { data: insertedComment } = await supabase
      .from('ticket_comments')
      .insert(commentData)
      .select()
      .single()

    if (insertedComment) {
      setComments((prev) => [...prev, insertedComment as Comment])
    }

    await supabase.channel('system-updates').send({
      type: 'broadcast',
      event: 'new_comment',
      payload: { ticket_id: selectedTicket.id },
    })
  }

  const executeDecision = async () => {
    if (!selectedTicket || !decisionModal.type) return
    const isApproved = decisionModal.type === 'resolve'
    const newStatus = isApproved ? 'resolved' : 'closed'
    const remarks =
      decisionModal.remarks.trim() ||
      (isApproved ? 'Concern resolved and finalized by HR Desk.' : 'Ticket closed by HR Desk.')

    // Optimistic Concurrency check
    const { data: latestTicket } = await supabase
      .from('tickets')
      .select('status')
      .eq('id', selectedTicket.id)
      .single()

    if (latestTicket?.status === 'resolved' || latestTicket?.status === 'closed') {
      alert(`Conflict Detected: This ticket was already marked ${latestTicket.status.toUpperCase()}.`)
      setSelectedTicket((prev) => (prev ? { ...prev, status: latestTicket.status } : null))
      fetchTickets(true)
      setDecisionModal({ type: null, title: '', remarks: '' })
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase
      .from('tickets')
      .update({
        status: newStatus,
        handling_mode: 'ADMIN',
      })
      .eq('id', selectedTicket.id)

    const decisionCard = isApproved
      ? `🎉 **[CONCERN RESOLVED & CLOSED BY HR]**\n\n**Resolution Notes:** ${remarks}\n\n**Reviewed By:** HR Administration\n**Date:** ${new Date().toLocaleString()}`
      : `❌ **[TICKET CLOSED WITHOUT RESOLUTION]**\n\n**Reason:** ${remarks}\n\n**Reviewed By:** HR Administration\n**Date:** ${new Date().toLocaleString()}`

    const { data: insertedComment } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: selectedTicket.id,
        author_id: user?.id as string,
        content: decisionCard,
        sender_role: 'admin',
      })
      .select()
      .single()

    if (insertedComment) {
      setComments((prev) => [...prev, insertedComment as Comment])
    }

    await supabase.channel('system-updates').send({
      type: 'broadcast',
      event: 'ticket_update',
      payload: { ticket_id: selectedTicket.id },
    })
    await supabase.channel('system-updates').send({
      type: 'broadcast',
      event: 'new_comment',
      payload: { ticket_id: selectedTicket.id },
    })

    setSelectedTicket({ ...selectedTicket, status: newStatus, handling_mode: 'ADMIN' })
    setDecisionModal({ type: null, title: '', remarks: '' })
    fetchTickets(true)
  }

  // Filtered tickets based on Image 2's filter categories
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(searchQuery.toLowerCase())
      const nameMatch = (t.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const categoryMatch = t.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSearch = !searchQuery.trim() || titleMatch || nameMatch || categoryMatch

      if (!matchesSearch) return false

      if (filterTab === 'needs_attention') {
        return t.status === 'open' || (t.status === 'in_progress' && t.handling_mode === 'ADMIN')
      }
      if (filterTab === 'in_progress') {
        return t.status === 'in_progress'
      }
      if (filterTab === 'resolved') {
        return t.status === 'resolved' || t.status === 'closed'
      }
      return true // 'all'
    })
  }, [tickets, searchQuery, filterTab])

  // Count metrics for filter tabs
  const needsAttentionCount = useMemo(
    () => tickets.filter((t) => t.status === 'open' || (t.status === 'in_progress' && t.handling_mode === 'ADMIN')).length,
    [tickets]
  )
  const inProgressCount = useMemo(
    () => tickets.filter((t) => t.status === 'in_progress').length,
    [tickets]
  )
  const resolvedCount = useMemo(
    () => tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
    [tickets]
  )

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top Filter and Search Strip (Matching Image 2) */}
      <div className="px-4 sm:px-6 py-4 flex flex-col gap-3 shrink-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
            Employee Tickets
          </h2>
          <p className="text-xs sm:text-sm text-[#575762] dark:text-[#B0B2BD]">
            Review employee concerns, requests, and responses.
          </p>
        </div>

        {/* Search & Filter Pills Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Filter Pills */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-[#EBEAEF] dark:bg-[#1A1B23] border border-black/[0.05] dark:border-white/[0.07] overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilterTab('needs_attention')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterTab === 'needs_attention'
                  ? 'bg-[#FAF9FB] dark:bg-[#282935] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                  : 'text-[#575762] dark:text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Needs attention
              {needsAttentionCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {needsAttentionCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#FAF9FB] dark:bg-[#282935] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                  : 'text-[#575762] dark:text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
              }`}
            >
              All tickets ({tickets.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('in_progress')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterTab === 'in_progress'
                  ? 'bg-[#FAF9FB] dark:bg-[#282935] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                  : 'text-[#575762] dark:text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              In progress
              {inProgressCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  {inProgressCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('resolved')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterTab === 'resolved'
                  ? 'bg-[#FAF9FB] dark:bg-[#282935] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                  : 'text-[#575762] dark:text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Resolved
              {resolvedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {resolvedCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Input (Matching Image 2 placeholder) */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8D9A]" />
            <input
              type="text"
              placeholder="Search by employee or ticket subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F5F4F7] dark:bg-[#1E1F27] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] focus:outline-hidden focus:ring-2 focus:ring-[#4D55CC] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Master-Detail Layout */}
      <div className="flex-1 flex min-h-0 px-4 sm:px-6 pb-4 gap-4 overflow-hidden">
        {/* Left Column: Scannable Ticket List */}
        <div className="w-full md:w-[380px] lg:w-[440px] flex flex-col shrink-0 rounded-2xl bg-[#F7F6F9] dark:bg-[#1A1B23] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shadow-xs">
          <div className="flex-1 overflow-y-auto divide-y divide-black/[0.05] dark:divide-white/[0.06] p-2 space-y-1.5">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-[#8E8D9A]">
                <Loader2 className="w-5 h-5 animate-spin text-[#4D55CC]" />
                <span className="text-xs">Loading concerns...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-16 text-center text-[#8E8D9A] text-xs px-4">
                No tickets found under this filter.
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const statusInfo = getTicketStatusInfo(ticket.status)
                const isSelected = selectedTicket?.id === ticket.id
                const applicantName = ticket.profiles?.full_name || 'Technician Employee'
                const applicantRole = ticket.profiles?.role || 'Field Operations'
                const timeAgo = formatTimeAgo(ticket.created_at)

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-[#EBEAEF] dark:bg-[#282935] shadow-xs border-l-4 border-l-[#4D55CC]'
                        : 'bg-[#FAF9FB] dark:bg-[#1E1F27] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Header Row: Title & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#121215] dark:text-[#F4F4F6] line-clamp-1">
                        {ticket.title}
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${statusInfo.bgClass} ${statusInfo.textClass} ${statusInfo.borderClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Subtitle: Submitter name & Dept */}
                    <div className="text-xs text-[#575762] dark:text-[#B0B2BD] flex items-center justify-between">
                      <span className="font-semibold truncate max-w-[200px]">
                        {applicantName} · {applicantRole}
                      </span>
                      <span className="text-[11px] text-[#8E8D9A] font-mono shrink-0">
                        {timeAgo}
                      </span>
                    </div>

                    {/* Details: Category & Handling Mode */}
                    <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[#7A7C88] dark:text-[#9A9BA6] font-medium">
                        {ticket.category}
                      </span>
                      {ticket.handling_mode === 'ADMIN' ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> HR Handling
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                          <Bot className="w-3 h-3" /> AI Active
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Master-Detail Conversation & Telemetry */}
        <div className="flex-1 flex flex-col min-w-0 rounded-2xl bg-[#FAF9FB] dark:bg-[#1A1B23] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shadow-xs">
          {selectedTicket ? (
            <div className="flex flex-col h-full min-w-0">
              {/* Conversation Header & Context Actions */}
              <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F7F6F9] dark:bg-[#1E1F27] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] text-[#575762] dark:text-[#9A9BA6]">
                      #{selectedTicket.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-[#4D55CC]">
                      {selectedTicket.category}
                    </span>
                    <span className="text-[#8E8D9A]">·</span>
                    <span className="text-xs text-[#575762] dark:text-[#9A9BA6]">
                      Submitted by <strong className="text-[#121215] dark:text-[#F4F4F6]">{selectedTicket.profiles?.full_name || 'Employee'}</strong>
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#121215] dark:text-[#F4F4F6] truncate">
                    {selectedTicket.title}
                  </h3>
                </div>

                {/* State-dependent Action Group */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' ? (
                    <>
                      {selectedTicket.handling_mode !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={handleTakeOver}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-[#FAF9FB] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Take Over from AI
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setDecisionModal({
                            type: 'resolve',
                            title: 'Resolve & Finalize Ticket',
                            remarks: '',
                          })
                        }
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-[#FAF9FB] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve Concern
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDecisionModal({
                            type: 'refuse',
                            title: 'Close Without Resolution',
                            remarks: '',
                          })
                        }
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Close
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      Finalized
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF9FB] dark:bg-[#16171E]">
                {/* Initial Description if present */}
                {selectedTicket.description && selectedTicket.description !== 'User initiated an AI support chat.' && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-xs p-3.5 bg-[#4D55CC] text-[#FAF9FB] shadow-xs text-xs leading-relaxed">
                      <div className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-1">
                        Technician Description
                      </div>
                      <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                  </div>
                )}

                {loadingComments ? (
                  <div className="py-8 text-center text-xs text-[#8E8D9A]">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[#4D55CC]" />
                    Loading conversation...
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isStaff = comment.sender_role === 'admin'
                    const isAi = comment.sender_role === 'ai'
                    const isSystem = comment.sender_role === 'system'

                    if (isSystem) {
                      return (
                        <div key={comment.id} className="flex justify-center my-1">
                          <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/[0.05] dark:bg-white/[0.06] text-[#7A7C88] dark:text-[#9A9BA6]">
                            {comment.content}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={comment.id}
                        className={`flex gap-2.5 ${isStaff ? 'justify-end' : 'justify-start'}`}
                      >
                        {isAi && (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}

                        <div
                          className={`max-w-[78%] rounded-2xl p-3.5 shadow-xs text-xs leading-relaxed ${
                            isStaff
                              ? 'rounded-tr-xs bg-[#4D55CC] text-[#FAF9FB]'
                              : isAi
                              ? 'rounded-tl-xs bg-[#F4F3F6] dark:bg-[#22232C] text-[#121215] dark:text-[#F4F4F6] border border-black/[0.05] dark:border-white/[0.07]'
                              : 'rounded-tl-xs bg-[#EBEAEF] dark:bg-[#282935] text-[#121215] dark:text-[#F4F4F6]'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                              isStaff ? 'text-white/80' : isAi ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#7A7C88]'
                            }`}
                          >
                            {isStaff ? 'HR Specialist' : isAi ? 'AI Support Assistant' : 'Technician'}
                          </div>

                          <p className="whitespace-pre-wrap">{comment.content}</p>

                          {/* Image Attachment */}
                          {comment.attachment_url && (
                            <div className="mt-2 pt-2 border-t border-black/[0.1] dark:border-white/[0.1]">
                              {isImageAttachment(comment.attachment_url, comment.attachment_type) ? (
                                <div
                                  onClick={() => setPreviewLightboxUrl(comment.attachment_url!)}
                                  className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-black/10 bg-black/5"
                                >
                                  <img
                                    src={comment.attachment_url}
                                    alt="Attachment"
                                    className="max-h-40 w-full object-cover rounded-xl"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                    <ZoomIn className="w-3.5 h-3.5" /> Expand
                                  </div>
                                </div>
                              ) : (
                                <a
                                  href={comment.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs underline font-semibold"
                                >
                                  <FileText className="w-3.5 h-3.5" /> View Attached Document
                                </a>
                              )}
                            </div>
                          )}

                          <span
                            className={`block text-[10px] text-right mt-1.5 ${
                              isStaff ? 'text-white/70' : 'text-[#8E8D9A]'
                            }`}
                          >
                            {new Date(comment.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}

                {peerTyping?.isTyping && peerTyping.ticketId === selectedTicket.id && (
                  <KineticTypingBubble role={peerTyping.role} userName={peerTyping.userName} />
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Bottom Reply Composer */}
              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#F7F6F9] dark:bg-[#1E1F27] flex flex-col gap-2 shrink-0">
                  {attachedAdminFile && (
                    <div className="px-3 py-1.5 rounded-xl bg-[#4D55CC]/10 border border-[#4D55CC]/25 flex items-center justify-between text-xs text-[#4D55CC]">
                      <span className="truncate max-w-xs font-semibold">{attachedAdminFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedAdminFile(null)}
                        className="p-1 hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp,.pdf,.doc,.docx,.xlsx,.xls"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-[#EBEAEF] dark:bg-[#282935] hover:bg-black/[0.08] dark:hover:bg-white/[0.09] text-[#575762] dark:text-[#B0B2BD] border border-black/[0.06] dark:border-white/[0.08] transition-all cursor-pointer"
                      title="Attach file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <div className="flex-1 rounded-xl bg-[#FAF9FB] dark:bg-[#16171E] border border-black/[0.08] dark:border-white/[0.1] px-3 py-2 flex items-center">
                      <input
                        type="text"
                        placeholder="Reply to employee as HR Specialist..."
                        value={newComment}
                        onChange={(e) => handleAdminInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        className="w-full bg-transparent text-xs text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={(!newComment.trim() && !attachedAdminFile) || uploadingAttachment}
                      onClick={handleSendMessage}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#4D55CC] hover:bg-[#434AB8] text-[#FAF9FB] shadow-md transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8E8D9A]">
              <div className="w-12 h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#121215] dark:text-[#F4F4F6] mb-1">
                No ticket selected
              </h4>
              <p className="text-xs text-[#7A7C88] max-w-xs">
                Select an employee ticket from the queue on the left to read conversation history or respond.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Decision Resolution / Refusal Modal */}
      {decisionModal.type && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FAF9FB] dark:bg-[#1E1F27] rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl max-w-md w-full p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    decisionModal.type === 'resolve'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-rose-500/15 text-rose-600'
                  }`}
                >
                  {decisionModal.type === 'resolve' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                    {decisionModal.title}
                  </h3>
                  <p className="text-[10px] text-[#8E8D9A]">
                    Ref #{selectedTicket?.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDecisionModal({ type: null, title: '', remarks: '' })}
                className="text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121215] dark:text-[#F4F4F6] mb-1.5">
                {decisionModal.type === 'resolve'
                  ? 'Resolution Notes (Visible to Employee)'
                  : 'Reason for Closing'}
              </label>
              <textarea
                rows={3}
                value={decisionModal.remarks}
                onChange={(e) => setDecisionModal((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder={
                  decisionModal.type === 'resolve'
                    ? 'e.g. Issue resolved. Corrected the attendance record and cleared the discrepancy.'
                    : 'e.g. Inquiry addressed or duplicate submission.'
                }
                className="w-full p-3 rounded-xl bg-[#F5F4F7] dark:bg-[#16171E] border border-black/[0.08] dark:border-white/[0.1] text-xs text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] focus:outline-hidden focus:ring-2 focus:ring-[#4D55CC]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDecisionModal({ type: null, title: '', remarks: '' })}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#EBEAEF] dark:bg-[#282935] text-[#121215] dark:text-[#F4F4F6] hover:bg-black/[0.08] dark:hover:bg-white/[0.09] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDecision}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-[#FAF9FB] shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  decisionModal.type === 'resolve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {decisionModal.type === 'resolve' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Confirm {decisionModal.type === 'resolve' ? 'Resolution' : 'Closure'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewLightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewLightboxUrl}
              alt="Fullscreen Preview"
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
