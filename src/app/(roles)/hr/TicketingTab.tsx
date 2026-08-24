'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, CheckCircle, Search, Filter, ChevronLeft, ChevronRight, X, User } from 'lucide-react'

type Ticket = {
  id: string
  title: string
  category: string
  description: string
  status: string
  priority: string
  created_at: string
  profiles?: { full_name: string }
}

export function TicketingTab() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const itemsPerPage = 5
  
  const supabase = createClient()

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('*, profiles!employee_id(full_name)')
      .order('created_at', { ascending: false })
    
    if (data) setTickets(data as any)
    setLoading(false)
  }

  const resolveTicket = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click
    await supabase.from('tickets').update({ status: 'resolved' }).eq('id', id)
    fetchTickets()
    if (selectedTicket?.id === id) {
      setSelectedTicket({ ...selectedTicket, status: 'resolved' })
    }
  }

  // Derived state for filtering and pagination
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (ticket.profiles?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage)
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryColor = (cat: string) => {
    if (cat.toLowerCase().includes('tool')) return 'bg-purple-100 text-purple-800'
    if (cat.toLowerCase().includes('payroll')) return 'bg-emerald-100 text-emerald-800'
    if (cat.toLowerCase().includes('leave')) return 'bg-sky-100 text-sky-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading tickets...</div>

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden flex-1 flex flex-col h-full">
      {/* Toolbar - Search and Filter next to each other */}
      <div className="p-4 border-b border-gray-300 bg-gray-50 flex flex-wrap gap-4 items-center justify-start shrink-0">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>
      
      {/* Data Table with strict grid borders and unified column widths */}
      <div className="overflow-y-scroll flex-1 [scrollbar-gutter:stable]">
        <table className="min-w-full border-collapse border border-gray-300 table-fixed">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[32%]">Ticket ID & Title</th>
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[22%]">Issuer</th>
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[20%]">Category</th>
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[13%]">Status</th>
              <th className="border border-gray-300 px-4 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-[13%]">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedTickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-gray-300 px-6 py-12 text-center text-gray-500">No tickets match your filters.</td>
              </tr>
            ) : (
              paginatedTickets.map((ticket) => (
                <tr 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                >
                  <td className="border border-gray-300 px-4 py-2.5 overflow-hidden">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-mono text-gray-500 mb-0.5">#{ticket.id.split('-')[0].toUpperCase()}</span>
                      <span className="text-sm font-bold text-gray-900 truncate">{ticket.title}</span>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      {ticket.profiles?.full_name || 'Unknown User'}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${getCategoryColor(ticket.category)}`}>
                      {ticket.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold ${
                      ticket.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {ticket.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap text-center">
                    {ticket.status === 'open' ? (
                      <button 
                        onClick={(e) => resolveTicket(ticket.id, e)}
                        className="inline-flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded font-medium transition-colors shadow-sm text-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Resolve
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm font-medium">Completed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-300 flex items-center justify-between shrink-0">
        <p className="text-sm text-gray-700">
          Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredTickets.length)}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredTickets.length)}</span> of <span className="font-semibold">{filteredTickets.length}</span> results
        </p>
        <nav className="inline-flex rounded-md shadow-sm">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-l-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-2 border-t border-b border-gray-300 text-sm font-medium ${currentPage === i + 1 ? 'bg-indigo-50 text-indigo-600 border-indigo-200 z-10' : 'bg-white text-gray-500 hover:bg-gray-50'} -ml-px`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-3 py-2 rounded-r-md border border-gray-300 border-l bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 -ml-px text-sm font-medium"
          >
            Next
          </button>
        </nav>
      </div>

      {/* Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedTicket.title}</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">Ticket ID: {selectedTicket.id}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Issuer Name</p>
                  <p className="text-base font-medium text-gray-900">{selectedTicket.profiles?.full_name || 'Unknown User'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Filed</p>
                  <p className="text-base font-medium text-gray-900">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category & Priority</p>
                  <div className="flex gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getCategoryColor(selectedTicket.category)}`}>
                      {selectedTicket.category.toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded border text-sm font-bold ${selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                    {selectedTicket.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Full Description</p>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={() => setSelectedTicket(null)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Close Window
              </button>
              {selectedTicket.status !== 'resolved' && (
                <button 
                  onClick={(e) => resolveTicket(selectedTicket.id, e)}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
