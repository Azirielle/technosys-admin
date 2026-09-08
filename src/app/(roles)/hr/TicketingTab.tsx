'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Filter, MessageSquare, Bot, User, Clock, AlertTriangle, Activity, Send, X, ShieldAlert, Archive, CheckCircle2, XCircle, Inbox, Paperclip, FileText, ZoomIn, ExternalLink, Loader2 } from 'lucide-react'

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
  profiles?: { full_name: string }
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

export function TicketingTab() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [quickFilter, setQuickFilter] = useState<'all' | 'urgent' | 'admin' | 'resolved' | 'archived'>('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [attachedAdminFile, setAttachedAdminFile] = useState<{ file: File; preview: string; name: string; type: string } | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null)
  const [decisionModal, setDecisionModal] = useState<{
    type: 'resolve' | 'reject' | null
    title: string
    remarks: string
  }>({ type: null, title: '', remarks: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const selectedTicketRef = useRef<Ticket | null>(null)
  selectedTicketRef.current = selectedTicket

  // Single persistent global channel for all system updates
  useEffect(() => {
    fetchTickets()

    const channel = supabase.channel('system-updates', {
      config: {
        broadcast: { self: false },
      },
    })
      .on('broadcast', { event: 'ticket_update' }, () => {
         fetchTickets(true);
      })
      .on('broadcast', { event: 'new_comment' }, (payload) => {
         const tId = payload?.payload?.ticket_id ?? payload?.ticket_id;
         fetchTickets(true);
         if (selectedTicketRef.current && tId === selectedTicketRef.current.id) {
            fetchComments(selectedTicketRef.current.id, true);
         }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_comments' }, (payload) => {
         const newComment = payload.new as any;
         fetchTickets(true);
         if (selectedTicketRef.current && newComment?.ticket_id === selectedTicketRef.current.id) {
            fetchComments(selectedTicketRef.current.id, true);
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
         fetchTickets(true);
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // Persistent listener - never tear down on ticket selection

  useEffect(() => {
    if (selectedTicket) {
      fetchComments(selectedTicket.id)

      // Fallback polling heartbeat every 4 seconds while ticket is actively viewed
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
    const { data } = await supabase
      .from('tickets')
      .select('*, profiles!tickets_employee_id_fkey(full_name), assignee:profiles!tickets_assigned_to_fkey(full_name)')
      .order('created_at', { ascending: false })
    
    if (data) setTickets(data as any)
    if (!silent) setLoading(false)
  }

  const fetchComments = async (ticketId: string, silent = false) => {
    if (!silent) setLoadingComments(true)
    const { data } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      
    if (data) setComments(data as Comment[])
    if (!silent) setLoadingComments(false)
  }

  const handleTakeOver = async () => {
    if (!selectedTicket) return
    
    // Update ticket
    await supabase.from('tickets').update({ handling_mode: 'ADMIN', status: 'in_progress' }).eq('id', selectedTicket.id)
    
    // Add system message
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ticket_comments').insert({
      ticket_id: selectedTicket.id,
      content: 'An Admin has taken over the chat. The AI assistant has been disabled.',
      sender_role: 'system',
      author_id: user?.id
    })
    await supabase.channel('system-updates').send({ type: 'broadcast', event: 'new_comment', payload: { ticket_id: selectedTicket.id } })
    await supabase.channel('system-updates').send({ type: 'broadcast', event: 'ticket_update', payload: {} })
    
    // Optimistic update
    setSelectedTicket({ ...selectedTicket, handling_mode: 'ADMIN', status: 'in_progress' })
    fetchTickets()
  }

  const isImageAttachment = (url?: string | null, type?: string | null) => {
    if (!url) return false
    if (type?.startsWith('image/')) return true
    const cleanUrl = url.toLowerCase().split('?')[0]
    return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif')
  }

  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.docx', '.doc', '.xlsx', '.xls']
  const ALLOWED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext)
    const isMimeValid = file.type ? (ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith('image/')) : isExtValid

    if (!isExtValid && !isMimeValid) {
      alert('Unsupported file type. Only images (PNG, JPG, screenshots), PDF, Word (.docx), and Excel (.xlsx) files are supported.')
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
      type: file.type || 'application/octet-stream'
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSendMessage = async () => {
    if ((!newComment.trim() && !attachedAdminFile) || !selectedTicket || uploadingAttachment) return
    
    const { data: { user } } = await supabase.auth.getUser()
    
    let uploadedUrl: string | null = null
    let uploadedType: string | null = null

    if (attachedAdminFile) {
      setUploadingAttachment(true)
      const sanitizedName = attachedAdminFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `admin_${user?.id || 'staff'}/${Date.now()}_${sanitizedName}`
      
      const { error: uploadError } = await supabase.storage
        .from('ticket_attachments')
        .upload(filePath, attachedAdminFile.file, {
          contentType: attachedAdminFile.type
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('ticket_attachments').getPublicUrl(filePath)
        uploadedUrl = urlData.publicUrl
        uploadedType = attachedAdminFile.type
      } else {
        console.error("Failed to upload attachment:", uploadError)
        alert("Failed to upload attachment: " + uploadError.message)
        setUploadingAttachment(false)
        return
      }
      setUploadingAttachment(false)
    }

    const commentContent = newComment.trim() || (attachedAdminFile ? `Attached: ${attachedAdminFile.name}` : '')

    const commentData = {
      ticket_id: selectedTicket.id,
      author_id: user?.id,
      content: commentContent,
      sender_role: 'admin',
      attachment_url: uploadedUrl,
      attachment_type: uploadedType
    }
    
    setNewComment('')
    setAttachedAdminFile(null)
    const { data: insertedComment } = await supabase.from('ticket_comments').insert(commentData).select().single()
    if (insertedComment) {
      setComments(prev => [...prev, insertedComment as Comment])
    }
    await supabase.channel('system-updates').send({ type: 'broadcast', event: 'new_comment', payload: { ticket_id: selectedTicket.id } })
  }
  
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return
    await supabase.from('tickets').update({ status: newStatus }).eq('id', selectedTicket.id)
    setSelectedTicket({ ...selectedTicket, status: newStatus })
    fetchTickets()
  }

  const executeDecision = async () => {
    if (!selectedTicket || !decisionModal.type) return
    const isApproved = decisionModal.type === 'resolve'
    const newStatus = isApproved ? 'resolved' : 'closed'
    const remarks = decisionModal.remarks.trim() || (isApproved ? 'Approved by HR Desk.' : 'Request refused by HR Desk.')
    
    // 1. Optimistic Concurrency & Double-Submit Protection: Check latest state in DB
    const { data: latestTicket, error: fetchErr } = await supabase
      .from('tickets')
      .select('status')
      .eq('id', selectedTicket.id)
      .single()

    if (fetchErr || !latestTicket) {
      alert('Unable to verify current ticket status. Please check your network connection.')
      return
    }

    if (latestTicket.status === 'resolved' || latestTicket.status === 'closed') {
      alert(`Conflict Detected: This ticket has already been finalized as ${latestTicket.status.toUpperCase()} by an administrator. Duplicate decision prevented.`)
      setSelectedTicket(prev => prev ? { ...prev, status: latestTicket.status } : null)
      fetchTickets(true)
      setDecisionModal({ type: null, title: '', remarks: '' })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    // 2. Update ticket in DB
    const { error: updateErr } = await supabase.from('tickets').update({
      status: newStatus,
      handling_mode: 'ADMIN'
    }).eq('id', selectedTicket.id)

    if (updateErr) {
      alert('Failed to update ticket: ' + updateErr.message)
      return
    }

    // 3. Insert official decision comment
    const decisionCard = isApproved
      ? `🎉 **[TICKET APPROVED & RESOLVED BY HR]**\n\n**Resolution Notes:** ${remarks}\n\n**Reviewed By:** HR Staff\n**Decision Date:** ${new Date().toLocaleString()}`
      : `❌ **[TICKET REFUSED / REJECTED BY HR]**\n\n**Reason for Refusal:** ${remarks}\n\n**Reviewed By:** HR Staff\n**Decision Date:** ${new Date().toLocaleString()}`

    const { data: insertedComment } = await supabase.from('ticket_comments').insert({
      ticket_id: selectedTicket.id,
      author_id: user?.id,
      content: decisionCard,
      sender_role: 'admin'
    }).select().single()

    if (insertedComment) {
      setComments(prev => [...prev, insertedComment as Comment])
    }

    // 4. Broadcast real-time to mobile
    await supabase.channel('system-updates').send({ type: 'broadcast', event: 'ticket_update', payload: { ticket_id: selectedTicket.id } })
    await supabase.channel('system-updates').send({ type: 'broadcast', event: 'new_comment', payload: { ticket_id: selectedTicket.id } })

    // 5. Update local state
    setSelectedTicket(prev => prev ? { ...prev, status: newStatus, handling_mode: 'ADMIN' } : null)
    fetchTickets(true)
    setDecisionModal({ type: null, title: '', remarks: '' })
  }

  const kpis = {
    active: tickets.filter(t => !t.is_archived && t.status !== 'closed' && t.status !== 'resolved').length,
    urgent: tickets.filter(t => !t.is_archived && (t.priority?.toLowerCase() === 'urgent' || t.priority?.toLowerCase() === 'high') && t.status !== 'closed' && t.status !== 'resolved').length,
    adminMode: tickets.filter(t => !t.is_archived && t.handling_mode === 'ADMIN' && t.status !== 'closed').length,
    resolved: tickets.filter(t => !t.is_archived && (t.status === 'resolved' || t.status === 'closed')).length,
    archived: tickets.filter(t => t.is_archived === true).length
  }

  const filteredTickets = tickets.filter(ticket => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = 
      ticket.title.toLowerCase().includes(query) || 
      (ticket.profiles?.full_name?.toLowerCase() || '').includes(query) ||
      (ticket.category?.toLowerCase() || '').includes(query) ||
      ticket.id.toLowerCase().includes(query)

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesArchived = showArchived ? ticket.is_archived === true : !ticket.is_archived

    let matchesQuick = true
    if (quickFilter === 'urgent') {
      matchesQuick = (ticket.priority?.toLowerCase() === 'urgent' || ticket.priority?.toLowerCase() === 'high') && !ticket.is_archived
    } else if (quickFilter === 'admin') {
      matchesQuick = ticket.handling_mode === 'ADMIN' && !ticket.is_archived
    } else if (quickFilter === 'resolved') {
      matchesQuick = (ticket.status === 'resolved' || ticket.status === 'closed') && !ticket.is_archived
    } else if (quickFilter === 'archived') {
      matchesQuick = ticket.is_archived === true
    }

    return matchesSearch && matchesStatus && matchesArchived && matchesQuick
  })

  // Priority styling
  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">URGENT</span>
      case 'high': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">HIGH</span>
      case 'medium': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">MEDIUM</span>
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">LOW</span>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return <span className="px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200 text-xs font-bold">RESOLVED</span>
      case 'closed': return <span className="px-2 py-1 rounded bg-gray-200 text-gray-700 border border-gray-300 text-xs font-bold">CLOSED</span>
      case 'in_progress': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold">IN PROGRESS</span>
      default: return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs font-bold">OPEN</span>
    }
  }

  const handleArchiveToggle = async (ticket: Ticket) => {
    const newArchivedState = !ticket.is_archived
    const { error } = await supabase
      .from('tickets')
      .update({ is_archived: newArchivedState })
      .eq('id', ticket.id)

    if (!error) {
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, is_archived: newArchivedState } : t))
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket({ ...selectedTicket, is_archived: newArchivedState })
      }
      await supabase.channel('system-updates').send({ type: 'broadcast', event: 'ticket_update', payload: {} })
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading tickets...</div>

  return (
    <div className="flex flex-col h-full gap-2.5 w-full">
      {/* 1. SLIMLINE HORIZONTAL SEGMENTED TELEMETRY STRIP (SAVES 110PX VERTICAL SPACE) */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200/80 shadow-2xs shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          {/* Active Inbox Pill */}
          <button
            onClick={() => { setQuickFilter('all'); setShowArchived(false); setStatusFilter('all'); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              quickFilter === 'all' && !showArchived
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Active Inbox</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              quickFilter === 'all' && !showArchived ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}>{kpis.active}</span>
          </button>

          {/* Needs Attention Pill */}
          <button
            onClick={() => { setQuickFilter('urgent'); setShowArchived(false); setStatusFilter('all'); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              quickFilter === 'urgent' && !showArchived
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${quickFilter === 'urgent' && !showArchived ? 'text-white' : 'text-rose-500'}`} />
            <span>Needs Attention</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              quickFilter === 'urgent' && !showArchived ? 'bg-rose-700 text-white' : kpis.urgent > 0 ? 'bg-rose-100 text-rose-700 font-bold animate-pulse' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}>{kpis.urgent}</span>
          </button>

          {/* Admin Review Pill */}
          <button
            onClick={() => { setQuickFilter('admin'); setShowArchived(false); setStatusFilter('all'); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              quickFilter === 'admin' && !showArchived
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-purple-50'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${quickFilter === 'admin' && !showArchived ? 'text-white' : 'text-purple-600'}`} />
            <span>Admin Review</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              quickFilter === 'admin' && !showArchived ? 'bg-purple-800 text-white' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}>{kpis.adminMode}</span>
          </button>

          {/* Resolved Pill */}
          <button
            onClick={() => { setQuickFilter('resolved'); setShowArchived(false); setStatusFilter('resolved'); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              quickFilter === 'resolved' && !showArchived
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${quickFilter === 'resolved' && !showArchived ? 'text-white' : 'text-emerald-600'}`} />
            <span>Resolved</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              quickFilter === 'resolved' && !showArchived ? 'bg-emerald-800 text-white' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}>{kpis.resolved}</span>
          </button>

          {/* Cold Archive Pill */}
          <button
            onClick={() => { setQuickFilter('archived'); setShowArchived(true); setStatusFilter('all'); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showArchived || quickFilter === 'archived'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-amber-50'
            }`}
          >
            <Archive className={`w-3.5 h-3.5 ${showArchived || quickFilter === 'archived' ? 'text-white' : 'text-amber-600'}`} />
            <span>Vault Archive</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              showArchived || quickFilter === 'archived' ? 'bg-amber-700 text-white' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}>{kpis.archived}</span>
          </button>
        </div>

        {/* Live sync indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 shrink-0 pr-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Sync</span>
        </div>
      </div>

      {/* 2. UNIFIED APPLICATION CANVAS (NO FLOATING CARD SOUP) */}
      <div className="flex flex-1 min-h-0 bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden w-full">
        {/* LEFT COLUMN: MASTER INBOX */}
        <div className="w-80 lg:w-96 flex flex-col border-r border-zinc-200/80 shrink-0 bg-zinc-50/40">
          {/* Search and Filters Header */}
          <div className="p-3 border-b border-zinc-200/80 bg-white flex flex-col gap-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search tickets by title, name, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50/60 border border-zinc-200/80 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 py-1 px-2 border border-zinc-200/80 rounded-lg text-[11px] font-semibold focus:ring-1 focus:ring-indigo-500 bg-white text-zinc-700"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <button 
                onClick={() => {
                  const next = !showArchived
                  setShowArchived(next)
                  setQuickFilter(next ? 'archived' : 'all')
                  setStatusFilter('all')
                }}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
                  showArchived 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                {showArchived ? 'Active Tickets' : 'Archived'}
              </button>
            </div>
          </div>
          
          {/* Master Ticket List (High-Density Linear Rows) */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100/90">
            {filteredTickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)}
                className={`p-3.5 cursor-pointer transition-all text-left ${
                  selectedTicket?.id === ticket.id 
                    ? 'bg-indigo-50/70 border-l-3 border-l-indigo-600 pl-3' 
                    : 'hover:bg-zinc-100/60 border-l-3 border-l-transparent pl-3'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-zinc-600">
                      #{ticket.id.slice(0, 8).toUpperCase()}
                    </span>
                    {ticket.is_archived && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                        ARCHIVED
                      </span>
                    )}
                  </div>
                  {getPriorityBadge(ticket.priority)}
                </div>

                <h4 className="text-xs font-bold text-zinc-900 line-clamp-1 mb-1.5">{ticket.title}</h4>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="truncate max-w-[130px] font-medium text-zinc-700">
                    {ticket.profiles?.full_name || 'Unknown User'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-400">
                      {new Intl.DateTimeFormat('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      }).format(new Date(ticket.created_at))}
                    </span>
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredTickets.length === 0 && (
              <div className="text-center p-12 text-zinc-400 text-xs font-medium">
                No tickets found in this view.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL & CONVERSATION CANVAS */}
        {selectedTicket ? (
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Clean Detail Header */}
            <div className="p-4 border-b border-zinc-200/80 bg-white flex justify-between items-start gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                    #{selectedTicket.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase">
                    {selectedTicket.category}
                  </span>
                  {selectedTicket.is_archived && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <Archive className="w-3 h-3" /> ARCHIVED
                    </span>
                  )}
                  {selectedTicket.handling_mode === 'ADMIN' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> ADMIN TAKEOVER
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-zinc-900 truncate mt-1">{selectedTicket.title}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Issued by <span className="font-semibold text-zinc-700">{selectedTicket.profiles?.full_name || 'Unknown User'}</span> on {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>

              {/* Single Consolidated Action Bar */}
              {(() => {
                const isFormalSubmission = 
                  comments.some(c => c.content.includes('[FORM SUBMITTED') || c.content.includes('📋')) || 
                  (selectedTicket.category !== 'General Inquiry' && selectedTicket.title !== 'Support Conversation' && selectedTicket.description !== 'User initiated an AI support chat.');
                const isDecisionFinalized = selectedTicket.status === 'resolved' || selectedTicket.status === 'closed';

                return (
                  <div className="flex items-center gap-2 shrink-0">
                    {isFormalSubmission ? (
                      !isDecisionFinalized ? (
                        <>
                          <button
                            onClick={() => setDecisionModal({ type: 'resolve', title: 'Approve & Resolve Ticket', remarks: '' })}
                            className="py-1.5 px-3 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            title="Formally approve and resolve ticket with remarks"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve & Resolve
                          </button>
                          <button
                            onClick={() => setDecisionModal({ type: 'reject', title: 'Refuse / Reject Ticket', remarks: '' })}
                            className="py-1.5 px-3 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                            title="Formally refuse request and notify technician"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Refuse
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {selectedTicket.status === 'resolved' ? (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Decision: Resolved</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Decision: Refused</span>
                            </div>
                          )}
                          <button
                            onClick={() => handleStatusChange('open')}
                            className="py-1 px-2.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition-colors cursor-pointer"
                            title="Reopen ticket for reconsiderations"
                          >
                            Reopen
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 flex items-center gap-1">
                        <Bot className="w-3 h-3 text-emerald-600" />
                        AI Inquiry Session
                      </span>
                    )}

                    <button
                      onClick={() => handleArchiveToggle(selectedTicket)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                        selectedTicket.is_archived 
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300' 
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      {selectedTicket.is_archived ? 'Restore' : 'Archive'}
                    </button>
                    <select 
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="py-1.5 px-2.5 border border-zinc-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 bg-white shadow-2xs text-zinc-800"
                    >
                      <option value="open">Status: Open</option>
                      <option value="in_progress">Status: In Progress</option>
                      <option value="resolved">Status: Resolved</option>
                      <option value="closed">Status: Closed</option>
                    </select>
                  </div>
                );
              })()}
            </div>

            {/* Cold Storage Information Banner (Single Source of Truth, No Button Echo) */}
            {selectedTicket.is_archived && (
              <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200/70 flex items-center gap-2 text-xs font-semibold text-amber-800 shrink-0">
                <Archive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Ticket is preserved in cold archive. Automated AI loops and dispatches are halted.</span>
              </div>
            )}

            {/* AI Summary Banner (Internal Only) */}
            {selectedTicket.admin_summary && (
              <div className="px-4 py-2.5 bg-yellow-50/70 border-b border-yellow-200/60 flex gap-2.5 items-start shrink-0">
                <Activity className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-yellow-800">AI Internal Summary</h4>
                  <p className="text-xs text-yellow-700 mt-0.5 leading-relaxed">{selectedTicket.admin_summary}</p>
                </div>
              </div>
            )}

            {/* Chat Conversation Canvas */}
            <div className="flex-1 overflow-y-auto p-5 bg-zinc-50/40 flex flex-col gap-3.5">
              {/* Original Issue Bubble (Only shown as fallback before formal submission or comments) */}
              {comments.length === 0 && selectedTicket.description && selectedTicket.description !== 'User initiated an AI support chat.' && (
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-2xs">
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                    
                    {/* Attachment in Original Submission */}
                    {selectedTicket.attachment_url && (
                      <div className="mt-2.5 pt-2 border-t border-indigo-500/50">
                        {isImageAttachment(selectedTicket.attachment_url, selectedTicket.attachment_type) ? (
                          <div 
                            onClick={() => setPreviewLightboxUrl(selectedTicket.attachment_url!)}
                            className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-white/20 bg-black/20"
                          >
                            <img 
                              src={selectedTicket.attachment_url} 
                              alt="Attached Proof" 
                              className="max-h-48 w-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.02]" 
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                              <ZoomIn className="w-4 h-4" /> Click to expand
                            </div>
                          </div>
                        ) : (
                          <a 
                            href={selectedTicket.attachment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white transition-colors"
                          >
                            <FileText className="w-4 h-4 text-indigo-200 shrink-0" />
                            <span className="truncate max-w-[180px]">View Attachment Document</span>
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-200 ml-auto shrink-0" />
                          </a>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-indigo-200 mt-1.5 block text-right">Original Submission</span>
                  </div>
                </div>
              )}
              
              {loadingComments ? (
                <div className="text-center text-zinc-400 text-xs py-4">Loading conversation history...</div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className={`flex ${comment.sender_role === 'admin' || comment.sender_role === 'technician' ? 'justify-end' : 'justify-start'} ${comment.sender_role === 'system' ? 'justify-center' : ''}`}>
                    
                    {comment.sender_role === 'system' ? (
                      <div className="bg-zinc-200/70 text-zinc-600 text-[11px] font-medium px-3.5 py-1 rounded-full my-1.5 flex items-center gap-1.5">
                        <ShieldAlert className="w-3 h-3" />
                        {comment.content}
                      </div>
                    ) : (
                      <div className="flex gap-2 max-w-[75%]">
                        {comment.sender_role === 'ai' && (
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-1">
                            <Bot className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                        )}
                        
                        <div className={`px-4 py-2.5 rounded-2xl shadow-2xs ${
                          comment.sender_role === 'admin' ? (
                            comment.content.includes('[TICKET APPROVED') 
                              ? 'bg-emerald-700 text-white rounded-tr-xs border border-emerald-500' 
                              : comment.content.includes('[TICKET REFUSED') 
                                ? 'bg-rose-700 text-white rounded-tr-xs border border-rose-500' 
                                : 'bg-purple-600 text-white rounded-tr-xs'
                          ) :
                          comment.sender_role === 'technician' ? 'bg-indigo-600 text-white rounded-tr-xs' :
                          'bg-white border border-zinc-200/80 text-zinc-900 rounded-tl-xs'
                        }`}>
                          {comment.sender_role === 'admin' && (
                            <div className="text-[9px] font-bold text-white/80 mb-0.5 uppercase tracking-wider">
                              {comment.content.includes('[TICKET APPROVED') ? 'HR Decision • Approved' :
                               comment.content.includes('[TICKET REFUSED') ? 'HR Decision • Refused' :
                               'Admin Response'}
                            </div>
                          )}
                          {comment.sender_role === 'technician' && (
                            <div className="text-[9px] font-bold text-indigo-200 mb-0.5 uppercase tracking-wider">
                              {comment.content.startsWith('📋') ? 'Formal Submission' : 'Technician Message'}
                            </div>
                          )}
                          {comment.sender_role === 'ai' && <div className="text-[9px] font-bold text-emerald-600 mb-0.5 uppercase tracking-wider">AI Support</div>}
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">{comment.content}</p>

                          {/* Comment Attachment Rendering */}
                          {comment.attachment_url && (
                            <div className="mt-2.5 pt-2 border-t border-zinc-200/40">
                              {isImageAttachment(comment.attachment_url, comment.attachment_type) ? (
                                <div 
                                  onClick={() => setPreviewLightboxUrl(comment.attachment_url!)}
                                  className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-black/10 bg-black/5"
                                >
                                  <img 
                                    src={comment.attachment_url} 
                                    alt="Comment Attachment" 
                                    className="max-h-48 w-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.02]" 
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                                    <ZoomIn className="w-4 h-4" /> Click to expand
                                  </div>
                                </div>
                              ) : (
                                <a 
                                  href={comment.attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                                    comment.sender_role === 'admin' || comment.sender_role === 'technician'
                                      ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                                      : 'bg-zinc-100 hover:bg-zinc-200/70 border-zinc-200 text-zinc-800'
                                  }`}
                                >
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="truncate max-w-[180px]">View Attached File</span>
                                  <ExternalLink className="w-3.5 h-3.5 ml-auto shrink-0 opacity-70" />
                                </a>
                              )}
                            </div>
                          )}

                          <span className={`text-[10px] mt-1 block ${comment.sender_role === 'admin' || comment.sender_role === 'technician' ? 'text-white/70 text-right' : 'text-zinc-400'}`}>
                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {comment.sender_role === 'admin' && (
                          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-1">
                            <User className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Streamlined Bottom Action Area */}
            <div className="shrink-0 bg-white border-t border-zinc-200/80">
              {selectedTicket.status === 'closed' || selectedTicket.status === 'resolved' ? (
                <div className="p-3 bg-zinc-50/80 text-center text-xs text-zinc-500 font-medium flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ticket is marked as <strong className="uppercase text-zinc-700">{selectedTicket.status}</strong>. Chat is read-only.</span>
                </div>
              ) : selectedTicket.handling_mode !== 'ADMIN' ? (
                <div className="p-3 bg-zinc-50/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs text-zinc-600">
                      <strong className="text-zinc-800">AI Assistant is active.</strong> Take over if human intervention is needed.
                    </p>
                  </div>
                  <button 
                    onClick={handleTakeOver}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Take Over Chat
                  </button>
                </div>
              ) : (
                <div className="p-3">
                  {/* Staged Attachment Chip */}
                  {attachedAdminFile && (
                    <div className="mb-2 p-2 bg-purple-50 border border-purple-200/80 rounded-xl flex items-center justify-between gap-2 max-w-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {attachedAdminFile.preview ? (
                          <img src={attachedAdminFile.preview} alt="Staged" className="w-8 h-8 rounded-lg object-cover border border-purple-200 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-purple-900 truncate">{attachedAdminFile.name}</p>
                          <p className="text-[10px] text-purple-600">{(attachedAdminFile.file.size / 1024).toFixed(0)} KB • Ready to send</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setAttachedAdminFile(null)} 
                        className="p-1 text-purple-400 hover:text-red-500 rounded-md hover:bg-purple-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
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
                      className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                        attachedAdminFile 
                          ? 'bg-purple-100 text-purple-700 border-purple-300' 
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 border-zinc-200/80'
                      }`}
                      title="Attach Image or Document"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <div className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-purple-500 focus-within:border-purple-500 focus-within:bg-white transition-all">
                      <textarea 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type response to technician as HR Admin..."
                        className="w-full bg-transparent p-2.5 text-xs focus:outline-none resize-none max-h-32 min-h-[38px] text-zinc-900"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                    </div>
                    <button 
                      onClick={handleSendMessage}
                      disabled={(!newComment.trim() && !attachedAdminFile) || uploadingAttachment}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white p-2.5 rounded-xl transition-colors shadow-2xs shrink-0 flex items-center justify-center min-w-[38px]"
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/30 text-zinc-400 p-8">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-bold text-zinc-700">No Ticket Selected</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs text-center leading-relaxed">
              Select a ticket from the inbox on the left to review communication logs, AI summaries, or take over.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox Fullscreen Preview */}
      {previewLightboxUrl && (
        <div 
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewLightboxUrl} 
              alt="Fullscreen Preview" 
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10" 
            />
            <div className="mt-3 flex items-center gap-3">
              <a 
                href={previewLightboxUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors backdrop-blur-md"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Full Image
              </a>
            </div>
          </div>
        </div>
      )}

      {/* HR Decision Modal (Approve / Refuse with Reason) */}
      {decisionModal.type && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  decisionModal.type === 'resolve' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {decisionModal.type === 'resolve' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">{decisionModal.title}</h3>
                  <p className="text-[11px] text-zinc-500">Ticket #{selectedTicket?.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setDecisionModal({ type: null, title: '', remarks: '' })}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                {decisionModal.type === 'resolve' ? 'Resolution Remarks / Approval Notes' : 'Reason for Refusal (Visible to Employee)'}
              </label>
              <textarea
                value={decisionModal.remarks}
                onChange={(e) => setDecisionModal(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder={decisionModal.type === 'resolve' 
                  ? "e.g., Leave request approved and recorded. Stand by for HR coordinator confirmation." 
                  : "e.g., Refused due to conflicting schedule or missing attachment proof. Please re-submit."}
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden resize-none placeholder:text-zinc-400 text-zinc-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setDecisionModal({ type: null, title: '', remarks: '' })}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDecision}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 ${
                  decisionModal.type === 'resolve' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {decisionModal.type === 'resolve' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                Confirm {decisionModal.type === 'resolve' ? 'Resolution' : 'Refusal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
