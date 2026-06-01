"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { 
  MessageSquare, Clock, User, UserCheck, Inbox, AlertCircle, 
  Filter, CheckCircle2, CornerDownRight, Search, RefreshCw, Send, Loader2
} from "lucide-react"
import { 
  updateTicketStatus, assignTicket, addTicketComment, getTicketComments 
} from "@/app/actions/tickets"

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
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("active") // active, open, assigned, in_progress, resolved, closed, all
  const [categoryFilter, setCategoryFilter] = useState("all")
  
  const [isPending, startTransition] = useTransition()
  const [commentPending, setCommentPending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch comments when a ticket is selected
  const loadComments = async (ticketId: string) => {
    setLoadingComments(true)
    try {
      const data = await getTicketComments(ticketId)
      setComments(data as any[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingComments(false)
    }
  }

  useEffect(() => {
    if (selectedTicket) {
      loadComments(selectedTicket.id)
    }
  }, [selectedTicket?.id])

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
        alert(res.error)
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
        alert(res.error)
      }
    })
  }

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !commentText.trim() || commentPending) return

    setCommentPending(true)
    const contentToSend = commentText.trim()
    setCommentText("")

    try {
      const res = await addTicketComment(selectedTicket.id, currentUserId, contentToSend)
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
        alert(res.error)
        setCommentText(contentToSend) // restore input
      }
    } catch (e: any) {
      alert("Failed to submit comment: " + e.message)
      setCommentText(contentToSend)
    } finally {
      setCommentPending(false)
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

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-50 overflow-hidden">
      
      {/* LEFT PANEL: Ticket List and Filters */}
      <div className="w-96 border-r border-zinc-200 bg-white flex flex-col h-full shadow-sm z-10 shrink-0">
        
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-zinc-200 space-y-3">
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

          <div className="flex gap-2 text-xs">
            <div className="flex-1">
              <label className="block text-zinc-400 font-semibold mb-1 text-[10px] uppercase">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full py-1.5 px-2 bg-zinc-50 border border-zinc-200 rounded-md font-medium text-zinc-700 outline-none text-xs"
              >
                <option value="all">All Categories</option>
                <option value="Leave Request">Leave Request</option>
                <option value="Payroll Dispute">Payroll Dispute</option>
                <option value="Benefits Inquiry">Benefits Inquiry</option>
                <option value="Equipment Issue">Equipment Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-zinc-400 font-semibold mb-1 text-[10px] uppercase">Status Filter</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full py-1.5 px-2 bg-zinc-50 border border-zinc-200 rounded-md font-medium text-zinc-700 outline-none text-xs"
              >
                <option value="active">Active (Open/In Prog)</option>
                <option value="open">Open Only</option>
                <option value="assigned">Assigned Only</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="all">All Tickets</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
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
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-medium">No matching tickets</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-[calc(100%-1rem)] mx-2 my-1 text-left p-4 hover:bg-slate-50 transition-all flex flex-col gap-2 rounded-xl border ${
                  selectedTicket?.id === ticket.id 
                    ? "bg-emerald-50/30 border-emerald-500 shadow-sm" 
                    : "border-zinc-100"
                }`}
              >
                <div className="flex justify-between items-start w-full gap-2">
                  <span className="font-bold text-zinc-800 text-sm line-clamp-1 flex-1">
                    {ticket.title}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-semibold ${getStatusClass(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>

                <p className="text-xs text-zinc-500 line-clamp-2">
                  {ticket.description}
                </p>

                <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-1">
                  <span className="font-medium flex items-center gap-1">
                    <User className="w-3 h-3 shrink-0" /> {ticket.employee.full_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" /> {formatDate(ticket.created_at)}
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
              <div className="flex justify-between items-center gap-4 bg-zinc-50 border border-zinc-150 rounded-xl p-3.5 text-xs text-zinc-600 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                    {selectedTicket.employee.full_name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-800">{selectedTicket.employee.full_name}</span>
                    <span className="text-zinc-400 block text-[10px]">Submitted {formatDate(selectedTicket.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Assignee</span>
                    <select
                      value={selectedTicket.assigned_to || ""}
                      onChange={e => handleAssignChange(e.target.value || null)}
                      className="mt-0.5 py-1 px-2.5 bg-white border border-zinc-200 rounded-md font-semibold text-zinc-700 outline-none text-xs"
                    >
                      <option value="">Unassigned</option>
                      {staffList.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.full_name} ({staff.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Ticket Action</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {selectedTicket.status !== "in_progress" && selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                        <button
                          onClick={() => handleStatusChange("in_progress")}
                          className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-1 px-2.5 rounded text-xs transition-colors"
                        >
                          In Progress
                        </button>
                      )}

                      {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                        <button
                          onClick={() => handleStatusChange("resolved")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-xs transition-colors"
                        >
                          Resolve
                        </button>
                      )}

                      {selectedTicket.status === "resolved" && (
                        <button
                          onClick={() => handleStatusChange("closed")}
                          className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-1 px-2.5 rounded text-xs transition-colors"
                        >
                          Close Ticket
                        </button>
                      )}

                      {(selectedTicket.status === "resolved" || selectedTicket.status === "closed") && (
                        <button
                          onClick={() => handleStatusChange("in_progress")}
                          className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-1 px-2.5 rounded text-xs transition-colors"
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
                <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
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
                          className={`flex items-start gap-3 max-w-[85%] ${
                            isCurrentUser ? "ml-auto flex-row-reverse" : ""
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                            isCurrentUser ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {c.author?.full_name?.charAt(0) || "U"}
                          </div>

                          <div className="space-y-1">
                            <div className={`flex items-center gap-2 text-[10px] ${
                              isCurrentUser ? "justify-end" : ""
                            }`}>
                              <span className="font-bold text-zinc-700">{c.author?.full_name}</span>
                              <span className="text-zinc-400">({c.author?.role})</span>
                              <span className="text-zinc-300">•</span>
                              <span className="text-zinc-400">{formatDate(c.created_at)}</span>
                            </div>

                            <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                              isCurrentUser 
                                ? "bg-emerald-600 text-white rounded-tr-none shadow-sm" 
                                : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-sm"
                            }`}>
                              {c.content}
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
              <form onSubmit={handlePostComment} className="flex gap-3">
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
                  type="submit"
                  disabled={!commentText.trim() || commentPending}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold p-3 px-5 rounded-xl transition-all self-end flex items-center gap-1.5 text-sm"
                >
                  {commentPending ? (
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
