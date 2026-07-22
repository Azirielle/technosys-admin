"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"
import { 
  MessageSquare, Clock, User, UserCheck, Inbox, AlertCircle, 
  Filter, CheckCircle2, CornerDownRight, Search, RefreshCw, Send, Loader2,
  Paperclip, File, X
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { 
  updateTicketStatus, assignTicket, addTicketComment, getTicketComments, markCommentsAsRead
} from "@/app/actions/tickets"
import Pagination from "@/components/ui/Pagination"

interface Profile {
  full_name: string
  role: string
}

interface Ticket {
  id: string
  employee_id: string
  title: string
  category: string
  description: string
  status: string
  priority: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  employee: Profile
  assignee: Profile | null
}

interface Comment {
  id: string
  ticket_id: string
  author_id: string
  content: string
  created_at: string
  author: Profile
  attachment_url?: string | null
  attachment_type?: string | null
  status?: string
  read_at?: string | null
}

interface Staff {
  id: string
  full_name: string
  role: string
}

interface TicketWorkspaceProps {
  initialTickets: Ticket[]
  staffList: Staff[]
  currentUserId: string
}

export default function TicketWorkspace({ 
  initialTickets, 
  staffList,
  currentUserId 
}: TicketWorkspaceProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const { alert, confirm } = useAlertConfirm()
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("active") // active, open, assigned, in_progress, resolved, closed, all
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  
  const [isPending, startTransition] = useTransition()
  const [commentPending, setCommentPending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Client-side Supabase and attachments state
  const supabase = createClient()
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false)
  const assigneeDropdownRef = useRef<HTMLDivElement>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setAssigneeDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Reset page to 1 when filters or search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, categoryFilter])

  // Fetch comments when a ticket is selected
  const loadComments = async (ticketId: string) => {
    setLoadingComments(true)
    try {
      let data = await getTicketComments(ticketId)

      // Mark comments written by others as read
      const unreadComments = data.filter(c => c.author_id !== currentUserId && c.read_at === null);
      if (unreadComments.length > 0) {
        markCommentsAsRead(ticketId, currentUserId).catch(err => {
          console.error("Failed to mark comments as read:", err);
        });
        
        data = data.map(c => c.author_id !== currentUserId ? { ...c, read_at: new Date().toISOString() } : c);
      }

      setUnreadCounts(prev => ({
        ...prev,
        [ticketId]: 0
      }))

      setComments(data as any[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingComments(false)
    }
  }

  // Fetch initial unread comment counts on mount
  useEffect(() => {
    const fetchInitialUnreadCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('ticket_comments')
          .select('ticket_id')
          .neq('author_id', currentUserId)
          .is('read_at', null)
          
        if (!error && data) {
          const counts: Record<string, number> = {}
          data.forEach((c: any) => {
            counts[c.ticket_id] = (counts[c.ticket_id] || 0) + 1
          })
          setUnreadCounts(counts)
        }
      } catch (err) {
        console.error("Failed to fetch initial unread counts:", err)
      }
    }
    fetchInitialUnreadCounts()
  }, [currentUserId])

  useEffect(() => {
    if (selectedTicket) {
      // Load initial comments
      loadComments(selectedTicket.id)
    }

    // Subscribe to global realtime comments updates to sync unread status and new messages instantly
    const channel = supabase
      .channel('global-ticket-comments')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'ticket_comments'
        },
        async (payload) => {
          console.log("Realtime global comment payload received:", payload)
          
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as Comment
            
            // Resolve author profile immediately so it doesn't render as "System"
            let authorProfile = null
            if (newComment.author_id === currentUserId) {
              authorProfile = { full_name: "You", role: "admin" }
            } else {
              const staff = staffList.find(s => s.id === newComment.author_id)
              if (staff) {
                authorProfile = { full_name: staff.full_name, role: staff.role }
              } else if (selectedTicket && selectedTicket.employee_id === newComment.author_id) {
                authorProfile = selectedTicket.employee
              } else {
                // Fetch profile dynamically from database
                const { data: prof } = await supabase
                  .from('profiles')
                  .select('full_name, role')
                  .eq('id', newComment.author_id)
                  .single()
                if (prof) {
                  authorProfile = prof
                }
              }
            }
            newComment.author = authorProfile || { full_name: "Staff", role: "technician" }

            // If comment is for the active ticket, append it to comments state
            if (selectedTicket && newComment.ticket_id === selectedTicket.id) {
              // If comment is from technician, mark it as read immediately if workspace is active
              if (newComment.author_id !== currentUserId && !newComment.read_at) {
                try {
                  await markCommentsAsRead(selectedTicket.id, currentUserId)
                  newComment.read_at = new Date().toISOString()
                } catch (err) {
                  console.warn("Failed to mark comment as read in realtime:", err)
                }
              }

              // Append comment to state if not already present
              setComments(prev => {
                const tempId = `temp-${newComment.created_at}`
                const exists = prev.some(c => c.id === newComment.id || c.id === tempId || (c.status === 'sending' && c.content === newComment.content))
                if (exists) {
                  return prev.map(c => (c.id === newComment.id || c.id.startsWith('temp-') || (c.status === 'sending' && c.content === newComment.content)) ? newComment : c)
                }
                return [...prev, newComment]
              })
            } else {
              // Increment unread counts for background tickets
              if (newComment.author_id !== currentUserId) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [newComment.ticket_id]: (prev[newComment.ticket_id] || 0) + 1
                }))
              }
            }

            // Bring the updated ticket to the top in the sidebar by updating its timestamp
            setTickets(prev => 
              prev.map(t => 
                t.id === newComment.ticket_id 
                  ? { ...t, updated_at: newComment.created_at } 
                  : t
              )
            )
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedComment = payload.new as Comment
            // Sync read receipt state changes
            if (selectedTicket && updatedComment.ticket_id === selectedTicket.id) {
              setComments(prev => prev.map(c => c.id === updatedComment.id ? { ...c, read_at: updatedComment.read_at } : c))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedTicket?.id, staffList, currentUserId])

  // Scroll to bottom of chat thread when comments update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return
    
    startTransition(async () => {
      const res = await updateTicketStatus(selectedTicket.id, newStatus)
      if (res.success) {
        // Update local ticket list state
        const updated = tickets.map(t => {
          if (t.id === selectedTicket.id) {
            return { ...t, status: newStatus, updated_at: new Date().toISOString() }
          }
          return t
        })
        setTickets(updated)
        setSelectedTicket({
          ...selectedTicket,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
      } else {
        await alert(res.error, "Update Failed", "destructive")
      }
    })
  }

  const handleAssignChange = async (staffId: string | null) => {
    if (!selectedTicket) return

    startTransition(async () => {
      const res = await assignTicket(selectedTicket.id, staffId)
      if (res.success) {
        const assignedStaff = staffList.find(s => s.id === staffId) || null
        const nextStatus = selectedTicket.status === "open" && staffId ? "assigned" : selectedTicket.status

        const updated = tickets.map(t => {
          if (t.id === selectedTicket.id) {
            return { 
              ...t, 
              assigned_to: staffId, 
              status: nextStatus,
              assignee: assignedStaff ? { full_name: assignedStaff.full_name, role: assignedStaff.role } : null,
              updated_at: new Date().toISOString()
            }
          }
          return t
        })
        setTickets(updated)
        setSelectedTicket({
          ...selectedTicket,
          assigned_to: staffId,
          status: nextStatus,
          assignee: assignedStaff ? { full_name: assignedStaff.full_name, role: assignedStaff.role } : null,
          updated_at: new Date().toISOString()
        })
      } else {
        await alert(res.error, "Assignment Failed", "destructive")
      }
    })
  }

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || (!commentText.trim() && !attachmentFile) || commentPending) return

    setCommentPending(true)
    const contentToSend = commentText.trim()
    
    // Clear inputs immediately
    setCommentText("")
    const fileToUpload = attachmentFile
    setAttachmentFile(null)

    const tempCommentId = 'temp-' + Date.now()
    const tempComment = {
      id: tempCommentId,
      ticket_id: selectedTicket.id,
      author_id: currentUserId,
      content: contentToSend || (fileToUpload ? `Sent an attachment: ${fileToUpload.name}` : ''),
      created_at: new Date().toISOString(),
      status: 'sending',
      author: { full_name: "TechnoSys Admin", role: 'admin' },
      attachment_url: fileToUpload ? URL.createObjectURL(fileToUpload) : null,
      attachment_type: fileToUpload ? (fileToUpload.type.startsWith('image/') ? 'image' : 'pdf') : null
    }

    setComments(prev => [...prev, tempComment as any])

    try {
      let attachmentUrl: string | null = null
      let attachmentType: string | null = null

      if (fileToUpload) {
        setUploadingAttachment(true)
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, fileToUpload, { cacheControl: '3650000', upsert: true })

        if (storageErr) throw storageErr

        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName)

        attachmentUrl = urlData.publicUrl
        attachmentType = fileToUpload.type.startsWith('image/') ? 'image' : 'pdf'
      }

      const res = await addTicketComment(selectedTicket.id, currentUserId, contentToSend, attachmentUrl, attachmentType)
      if (res.success) {
        // Refetch comments
        await loadComments(selectedTicket.id)
        
        // Touch ticket updated_at in local list
        const updated = tickets.map(t => {
          if (t.id === selectedTicket.id) {
            return { ...t, updated_at: new Date().toISOString() }
          }
          return t
        })
        setTickets(updated)
      } else {
        await alert(res.error || "Comment Failed", "Comment Failed", "destructive")
        setComments(prev => prev.filter(c => c.id !== tempCommentId))
        setCommentText(contentToSend) // restore input
        if (fileToUpload) setAttachmentFile(fileToUpload) // restore attachment
      }
    } catch (e: any) {
      await alert("Failed to submit comment: " + e.message, "Comment Failed", "destructive")
      setComments(prev => prev.filter(c => c.id !== tempCommentId))
      setCommentText(contentToSend)
      if (fileToUpload) setAttachmentFile(fileToUpload)
    } finally {
      setCommentPending(false)
      setUploadingAttachment(false)
    }
  }

  const refreshAll = async () => {
    // A quick way to refresh the whole board
    window.location.reload()
  }

  // Filter logic
  const filteredTickets = tickets.filter(t => {
    // Search filter
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    let matchesStatus = true
    if (statusFilter === "active") {
      matchesStatus = ["open", "assigned", "in_progress"].includes(t.status)
    } else if (statusFilter !== "all") {
      matchesStatus = t.status === statusFilter
    }

    // Category filter
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const totalItems = filteredTickets.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Format Helper
  const formatDate = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  // Elapsed Time Helper
  const getElapsedTime = (isoString: string) => {
    const now = new Date()
    const past = new Date(isoString)
    const diffMs = now.getTime() - past.getTime()
    if (diffMs < 0) return "just now"
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return "yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return past.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Category Color Class Generator (Contrast Checked >= 4.5:1)
  const getCategoryClass = (category: string) => {
    switch (category) {
      case "Leave Request": return "bg-blue-50 text-blue-900 border-blue-200"
      case "Payroll Dispute": return "bg-amber-50 text-amber-900 border-amber-250"
      case "Benefits Inquiry": return "bg-indigo-50 text-indigo-900 border-indigo-200"
      case "Equipment Issue": return "bg-rose-50 text-rose-900 border-rose-250"
      default: return "bg-slate-50 text-slate-900 border-slate-200"
    }
  }

  // Left-border color accents per category
  const getCategoryBorderClass = (category: string) => {
    switch (category) {
      case "Leave Request": return "border-l-blue-400"
      case "Payroll Dispute": return "border-l-amber-500"
      case "Benefits Inquiry": return "border-l-indigo-400"
      case "Equipment Issue": return "border-l-rose-500"
      default: return "border-l-zinc-300"
    }
  }

  // Status Styling Generator (Contrast Checked >= 4.5:1)
  const getStatusClass = (status: string) => {
    switch (status) {
      case "open": return "bg-emerald-50 text-emerald-900 border-emerald-200"
      case "assigned": return "bg-blue-50 text-blue-900 border-blue-200"
      case "in_progress": return "bg-violet-50 text-violet-900 border-violet-200"
      case "resolved": return "bg-zinc-100 text-zinc-900 border-zinc-200"
      case "closed": return "bg-slate-100 text-slate-650 border-slate-250 line-through"
      default: return "bg-slate-50 text-slate-900 border-slate-200"
    }
  }

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "low": return "text-zinc-500 font-normal"
      case "medium": return "text-amber-600 font-semibold"
      case "high": return "text-orange-600 font-bold"
      case "urgent": return "text-rose-600 font-extrabold tracking-wide uppercase text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
      default: return "text-zinc-500"
    }
  }

  // Dynamic counts for category filters (always respects statusFilter and searchQuery)
  const getCategoryCount = (categoryVal: string) => {
    return tickets.filter(t => {
      // Status filter
      let matchesStatus = true
      if (statusFilter === "active") {
        matchesStatus = ["open", "assigned", "in_progress"].includes(t.status)
      } else if (statusFilter !== "all") {
        matchesStatus = t.status === statusFilter
      }
      
      // Search filter
      const matchesSearch = 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesStatus || !matchesSearch) return false

      if (categoryVal === "all") {
        return true
      } else {
        return t.category === categoryVal
      }
    }).length
  }

  // Dynamic counts for status filters (always respects categoryFilter and searchQuery)
  const getStatusCount = (statusVal: string) => {
    return tickets.filter(t => {
      // Category filter
      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter
      // Search filter
      const matchesSearch = 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (!matchesCategory || !matchesSearch) return false

      if (statusVal === "active") {
        return ["open", "assigned", "in_progress"].includes(t.status)
      } else if (statusVal === "all") {
        return true
      } else {
        return t.status === statusVal
      }
    }).length
  }

  // Helper to format stringified JSON descriptions in the sidebar list
  const getDisplayDescription = (desc: string) => {
    if (!desc) return ""
    if (desc.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(desc)
        if (parsed.details) {
          return parsed.details
        }
        return Object.entries(parsed)
          .map(([key, val]) => `${key.replace(/_/g, " ").toUpperCase()}: ${val}`)
          .join(" | ")
      } catch (e) {
        return desc
      }
    }
    return desc
  }

  // Helper to render parsed description details in a bento grid format
  const renderDescription = (desc: string) => {
    if (!desc || !desc.trim().startsWith("{")) {
      return (
        <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
          {desc || "No description provided."}
        </p>
      )
    }

    try {
      const parsed = JSON.parse(desc)
      return (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {Object.entries(parsed).map(([key, val]) => {
              if (key === "details") return null
              const label = key.replace(/_/g, " ")
              return (
                <div key={key} className="p-3.5 bg-zinc-50 border border-zinc-150 rounded-xl flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">{label}</span>
                  <span className="text-sm font-bold text-zinc-850 mt-1 capitalize">
                    {key.toLowerCase().includes("amount") 
                      ? `₱${Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` 
                      : String(val)}
                  </span>
                </div>
              )
            })}
          </div>
          {parsed.details && (
            <div className="pt-3.5 border-t border-zinc-150">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block mb-1">Details & Context</span>
              <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap bg-zinc-50/50 p-4 rounded-xl border border-zinc-150">
                {parsed.details}
              </p>
            </div>
          )}
        </div>
      )
    } catch (e) {
      return (
        <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
          {desc}
        </p>
      )
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-50 overflow-hidden">
      
      {/* LEFT PANEL: Ticket List and Filters */}
      <div className="w-96 border-r border-zinc-200 bg-white flex flex-col h-full shadow-sm z-10 shrink-0">
        
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-zinc-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search tickets, technicians..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Segmented Filter Pills */}
          <div className="space-y-3">
            <div>
              <label className="block text-zinc-450 font-bold mb-1.5 text-[10px] uppercase tracking-wider">Category</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {[
                  { value: "all", label: "All", activeClass: "bg-zinc-950 text-white border-zinc-950", inactiveClass: "bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100" },
                  { value: "Leave Request", label: "Leave", activeClass: "bg-blue-600 text-white border-blue-600", inactiveClass: "bg-blue-50/60 text-blue-700 border-blue-200 hover:bg-blue-100/60" },
                  { value: "Payroll Dispute", label: "Payroll", activeClass: "bg-amber-600 text-white border-amber-600", inactiveClass: "bg-amber-50/60 text-amber-800 border-amber-250 hover:bg-amber-100/60" },
                  { value: "Benefits Inquiry", label: "Benefits", activeClass: "bg-indigo-600 text-white border-indigo-600", inactiveClass: "bg-indigo-50/60 text-indigo-700 border-indigo-200 hover:bg-indigo-100/60" },
                  { value: "Equipment Issue", label: "Equipment", activeClass: "bg-rose-600 text-white border-rose-600", inactiveClass: "bg-rose-50/60 text-rose-700 border-rose-250 hover:bg-rose-100/60" },
                  { value: "Other", label: "Other", activeClass: "bg-zinc-700 text-white border-zinc-700", inactiveClass: "bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100" }
                ].map(cat => {
                  const isActive = categoryFilter === cat.value
                  const count = getCategoryCount(cat.value)
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setCategoryFilter(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        isActive ? cat.activeClass : cat.inactiveClass
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-zinc-200/80 text-zinc-500"
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-zinc-455 font-bold mb-1.5 text-[10px] uppercase tracking-wider">Status</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {[
                  { value: "active", label: "Active", activeClass: "bg-emerald-600 text-white border-emerald-600" },
                  { value: "open", label: "Open", activeClass: "bg-blue-600 text-white border-blue-600" },
                  { value: "assigned", label: "Assigned", activeClass: "bg-indigo-600 text-white border-indigo-600" },
                  { value: "in_progress", label: "In Progress", activeClass: "bg-violet-600 text-white border-violet-600" },
                  { value: "resolved", label: "Resolved", activeClass: "bg-zinc-605 bg-zinc-600 text-white border-zinc-600" },
                  { value: "closed", label: "Closed", activeClass: "bg-slate-600 text-white border-slate-600" },
                  { value: "all", label: "All", activeClass: "bg-zinc-950 text-white border-zinc-950" }
                ].map(stat => {
                  const isActive = statusFilter === stat.value
                  const count = getStatusCount(stat.value)
                  return (
                    <button
                      key={stat.value}
                      onClick={() => setStatusFilter(stat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        isActive ? stat.activeClass : "bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      <span>{stat.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-zinc-200/80 text-zinc-500"
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100">
            <span>Showing {filteredTickets.length} tickets</span>
            <button 
              onClick={refreshAll} 
              className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {/* Tickets Scroll List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 bg-zinc-50/30">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No matching tickets</p>
            </div>
          ) : (
            paginatedTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-[calc(100%-1rem)] mx-2 my-1.5 text-left p-3.5 hover:bg-slate-50 transition-all flex flex-col gap-2 rounded-lg border border-l-4 shadow-sm ${
                  selectedTicket?.id === ticket.id 
                    ? "bg-emerald-50/30 border-emerald-500/50" 
                    : "bg-white border-zinc-200/80"
                } ${getCategoryBorderClass(ticket.category)}`}
              >
                <div className="flex justify-between items-start w-full gap-2">
                  <span className="font-bold text-zinc-900 text-sm line-clamp-1 flex-1 leading-tight">
                    {ticket.title}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCounts[ticket.id] > 0 && (
                      <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full animate-bounce">
                        {unreadCounts[ticket.id]}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-semibold ${getStatusClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-550 line-clamp-2 leading-relaxed">
                  {getDisplayDescription(ticket.description)}
                </p>

                <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-100">
                  <span className="font-semibold flex items-center gap-1 text-zinc-500">
                    <User className="w-3 h-3 shrink-0" />
                    <span>
                      By: {ticket.employee.full_name} {ticket.assignee && `• Tech: ${ticket.assignee.full_name}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-zinc-400">
                    <Clock className="w-3 h-3 shrink-0" /> {getElapsedTime(ticket.created_at)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-1">
                  <span className={`px-2 py-0.5 rounded border ${getCategoryClass(ticket.category)} font-medium`}>
                    {ticket.category}
                  </span>
                  <span className={`font-semibold ${getPriorityClass(ticket.priority)}`}>
                    {ticket.priority} priority
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemNamePlural="tickets"
        />
      </div>

      {/* RIGHT PANEL: Ticket Workspace & Conversation */}
      <div className="flex-1 bg-zinc-50 flex flex-col h-full overflow-hidden">
        {selectedTicket ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Selected Ticket Header */}
            <div className="bg-white border-b border-zinc-200 p-6 flex flex-col gap-4 shadow-sm z-10 shrink-0">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getStatusClass(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getCategoryClass(selectedTicket.category)}`}>
                      {selectedTicket.category}
                    </span>
                    <span className="text-zinc-300">|</span>
                    <span className={`text-xs font-semibold ${getPriorityClass(selectedTicket.priority)}`}>
                      {selectedTicket.priority} Priority
                    </span>
                  </div>
                  <h1 className="text-xl font-black text-zinc-950 tracking-tight leading-tight">
                    {selectedTicket.title}
                  </h1>
                </div>

                {isPending && (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600 shrink-0 mt-2" />
                )}
              </div>

              {/* Submitter Info Card */}
              <div className="flex justify-between items-center gap-4 bg-zinc-50 border border-zinc-150 rounded-xl p-3.5 text-xs text-zinc-650 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shadow-sm">
                    {selectedTicket.employee.full_name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-800">{selectedTicket.employee.full_name}</span>
                    <span className="text-zinc-400 block text-[10px]">Submitted {formatDate(selectedTicket.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Assignee Selector Popover */}
                  <div className="relative" ref={assigneeDropdownRef}>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Assignee</span>
                    <button
                      type="button"
                      onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                      className="flex items-center gap-1.5 py-1.5 px-3 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-md font-semibold text-zinc-700 text-xs transition-all shadow-sm"
                    >
                      <span>
                        {selectedTicket.assignee 
                          ? `${selectedTicket.assignee.full_name} (${selectedTicket.assignee.role})` 
                          : "Unassigned"}
                      </span>
                      <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                    </button>

                    {assigneeDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-64 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 z-50 max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            handleAssignChange(null)
                            setAssigneeDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-zinc-50 transition-colors ${
                            !selectedTicket.assigned_to ? "text-emerald-600 bg-emerald-50/30" : "text-zinc-700"
                          }`}
                        >
                          Unassigned
                        </button>
                        {staffList.map(staff => {
                          const isSelected = selectedTicket.assigned_to === staff.id
                          return (
                            <button
                              key={staff.id}
                              type="button"
                              onClick={() => {
                                handleAssignChange(staff.id)
                                setAssigneeDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-zinc-50 transition-colors border-t border-zinc-100 flex flex-col ${
                                isSelected ? "text-emerald-600 bg-emerald-50/30" : "text-zinc-700"
                              }`}
                            >
                              <span>{staff.full_name}</span>
                              <span className="text-[10px] text-zinc-400 font-normal">{staff.role}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Ticket Action</span>
                    <div className="flex items-center gap-1.5">
                      {selectedTicket.status !== "in_progress" && selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                        <button
                          onClick={() => handleStatusChange("in_progress")}
                          className="bg-zinc-950 hover:bg-zinc-900 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm"
                        >
                          In Progress
                        </button>
                      )}

                      {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                        <button
                          onClick={() => handleStatusChange("resolved")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm"
                        >
                          Resolve
                        </button>
                      )}

                      {selectedTicket.status === "resolved" && (
                        <button
                          onClick={() => handleStatusChange("closed")}
                          className="bg-zinc-500 hover:bg-zinc-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm"
                        >
                          Close Ticket
                        </button>
                      )}

                      {(selectedTicket.status === "resolved" || selectedTicket.status === "closed") && (
                        <button
                          onClick={() => handleStatusChange("in_progress")}
                          className="bg-zinc-950 hover:bg-zinc-900 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description and Comment Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Original Ticket Description */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-zinc-400" /> Original Request
                </h4>
                <div className="max-h-64 overflow-y-auto pr-1">
                  {renderDescription(selectedTicket.description)}
                </div>
              </div>

              {/* Discussion Segment */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-zinc-400" /> Discussion Thread
                </h3>

                {loadingComments ? (
                  <div className="py-8 text-center text-zinc-400 flex items-center justify-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> Loading comments...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-6 text-center text-zinc-400 text-xs italic">
                    No comments posted yet. Start the conversation below.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map(c => {
                      const isCurrentUser = c.author_id === currentUserId
                      return (
                        <div 
                          key={c.id} 
                          className={`flex items-end gap-2.5 max-w-[80%] ${
                            isCurrentUser ? "ml-auto flex-row-reverse" : ""
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                            isCurrentUser ? "bg-emerald-600 text-white shadow-sm" : "bg-zinc-200 text-zinc-700 border border-zinc-300 shadow-sm"
                          }`}>
                            {c.author?.full_name?.charAt(0) || "U"}
                          </div>

                          <div className="flex flex-col gap-1">
                            {/* Author name above bubble */}
                            <span className={`text-[10px] font-bold text-zinc-500 ${isCurrentUser ? "text-right" : ""}`}>
                              {c.author?.full_name} <span className="font-normal text-zinc-400">({c.author?.role})</span>
                            </span>
                            
                            {/* Chat bubble with inline timestamp */}
                            <div className={`flex items-end gap-2 ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                              <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                                isCurrentUser 
                                  ? "bg-emerald-600 text-white rounded-tr-none" 
                                  : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none"
                              }`}>
                                {c.content}
                                
                                {c.attachment_url && (
                                  <div className={c.content ? "mt-2 pt-2 border-t border-zinc-200/20 border-dashed" : ""}>
                                    {c.attachment_type === 'image' ? (
                                      <a href={c.attachment_url} target="_blank" rel="noopener noreferrer" className="block max-w-[200px] overflow-hidden rounded-md border border-zinc-200 bg-white">
                                        <img 
                                          src={c.attachment_url} 
                                          alt="Attachment" 
                                          className="w-full h-auto max-h-[160px] object-cover hover:opacity-90 transition-opacity" 
                                        />
                                      </a>
                                    ) : (
                                      <a 
                                        href={c.attachment_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold hover:bg-zinc-50 transition-colors ${
                                          isCurrentUser 
                                            ? "bg-zinc-800/20 border-zinc-500/20 text-white hover:bg-zinc-800/30" 
                                            : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                                        }`}
                                      >
                                        <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate max-w-[150px]">View Attachment (PDF)</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] text-zinc-400 whitespace-nowrap mb-1 flex flex-col items-end gap-0.5">
                                <span>{formatDate(c.created_at)}</span>
                                {isCurrentUser && (
                                  <span className={`text-[8px] font-bold ${
                                    c.status === 'sending' 
                                      ? 'text-zinc-400 animate-pulse' 
                                      : c.read_at 
                                        ? 'text-emerald-500 font-semibold' 
                                        : 'text-zinc-400'
                                  }`}>
                                    {c.status === 'sending' && 'Sending...'}
                                    {!c.status && (c.read_at ? '✓✓ Seen' : '✓ Delivered')}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Comment Composer */}
            <div className="bg-white border-t border-zinc-200 p-4 shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.02)]">
              {/* Attachment Preview Bar */}
              {attachmentFile && (
                <div className="flex items-center gap-2 p-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl mb-3 shrink-0 animate-in fade-in slide-in-from-bottom-1 duration-150">
                  <File className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-700 truncate max-w-[240px]">
                    {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(1)} KB)
                  </span>
                  {uploadingAttachment && (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0 ml-1" />
                  )}
                  <button
                    type="button"
                    disabled={uploadingAttachment || commentPending}
                    onClick={() => setAttachmentFile(null)}
                    className="p-1 hover:bg-zinc-200 rounded-lg ml-auto cursor-pointer text-zinc-400 hover:text-zinc-650 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handlePostComment} className="flex gap-3 items-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        alert("Upload blocked: File size exceeds the maximum allowed limit of 10 MB.")
                        e.target.value = ''
                        return
                      }
                      setAttachmentFile(file)
                    }
                  }}
                />

                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Type a response to the technician... (Press Ctrl+Enter to send)"
                  rows={2}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handlePostComment(e)
                    }
                  }}
                  className="flex-1 p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                />

                <button
                  type="button"
                  disabled={uploadingAttachment || commentPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 h-[46px] w-[46px]"
                  title="Attach File (Max 10 MB)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <button
                  type="submit"
                  disabled={(!commentText.trim() && !attachmentFile) || uploadingAttachment || commentPending}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold p-3 px-5 rounded-xl transition-all flex items-center gap-1.5 text-sm shrink-0 h-[46px]"
                >
                  {commentPending || uploadingAttachment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* Empty Workspace Panel */
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 shadow-sm animate-pulse">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-zinc-800">Select a ticket to open workspace</h2>
            <p className="text-sm text-zinc-500 text-center max-w-sm">
              Review filed requests, assign tickets to administrators or staff, and communicate directly with technicians in real time.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
