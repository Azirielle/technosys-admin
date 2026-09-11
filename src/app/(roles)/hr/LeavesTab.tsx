'use client'

import Pagination from '@/components/ui/Pagination'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Search, Filter, ChevronLeft, ChevronRight, User } from 'lucide-react'

type Leave = {
  id: string
  start_date: string
  end_date: string
  leave_type: string
  reason: string
  status: string
  created_at: string
  profiles?: { full_name: string }
}

export function LeavesTab() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null)
  const itemsPerPage = 5
  
  const supabase = createClient()

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leaves')
      .select('*, profiles!technician_id(full_name)')
      .order('created_at', { ascending: false })
    
    if (data) setLeaves(data as any)
    setLoading(false)
  }

  const updateLeaveStatus = async (id: string, newStatus: 'approved' | 'rejected', e?: React.MouseEvent) => {
    if (e) e.stopPropagation() // Prevent row click
    await supabase.from('leaves').update({ status: newStatus }).eq('id', id)
    fetchLeaves()
    if (selectedLeave?.id === id) {
      setSelectedLeave({ ...selectedLeave, status: newStatus })
    }
  }

  // Derived state for filtering and pagination
  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = leave.reason.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          leave.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (leave.profiles?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage)
  const paginatedLeaves = filteredLeaves.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  if (loading) return (
    <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 font-medium">
      Loading leave requests...
    </div>
  )

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xs border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex-1 flex flex-col h-full">
      {/* Toolbar - Search and Filter */}
      <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex flex-wrap gap-3 items-center justify-start shrink-0">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search leaves by name or reason..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="block w-full pl-9 pr-3 py-1.5 border border-zinc-200/80 dark:border-zinc-700 rounded-lg text-xs leading-5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="block w-full pl-2.5 pr-8 py-1.5 text-xs font-semibold border border-zinc-200/80 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      
      {/* Data Table */}
      <div className="overflow-y-scroll flex-1 [scrollbar-gutter:stable]">
        <table className="w-full border-collapse table-fixed">
          <thead className="bg-zinc-50 dark:bg-zinc-800/60 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="border-r border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 text-left text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider w-[32%]">Issuer & Reason</th>
              <th className="border-r border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 text-left text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider w-[22%]">Leave Type</th>
              <th className="border-r border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 text-left text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider w-[20%]">Duration</th>
              <th className="border-r border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 text-left text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider w-[13%]">Status</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider w-[13%]">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200/80 dark:divide-zinc-800">
            {paginatedLeaves.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">No leave requests match your filters.</td>
              </tr>
            ) : (
              paginatedLeaves.map((leave) => (
                <tr 
                  key={leave.id} 
                  onClick={() => setSelectedLeave(leave)}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <td className="border-r border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 overflow-hidden">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                        <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{leave.profiles?.full_name || 'Unknown User'}</span>
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{leave.reason}</span>
                    </div>
                  </td>
                  <td className="border-r border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 uppercase tracking-wider">
                      {leave.leave_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="border-r border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col text-xs text-zinc-900 dark:text-zinc-100 font-medium">
                      <span>{new Date(leave.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">to {new Date(leave.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </td>
                  <td className="border-r border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                      leave.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' :
                      leave.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' :
                      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                    }`}>
                      {leave.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-center">
                    {leave.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={(e) => updateLeaveStatus(leave.id, 'approved', e)}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 px-2.5 py-1 rounded-lg font-semibold transition-colors shadow-2xs text-[11px] cursor-pointer"
                          title="Approve leave request"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button 
                          onClick={(e) => updateLeaveStatus(leave.id, 'rejected', e)}
                          className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-500 px-2.5 py-1 rounded-lg font-semibold transition-colors shadow-2xs text-[11px] cursor-pointer"
                          title="Reject leave request"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium">Processed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredLeaves.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        itemNamePlural="leave requests"
      />

      {/* Detail Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4" onClick={() => setSelectedLeave(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-lg w-full flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Leave Request Details</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">ID: #{selectedLeave.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedLeave(null)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Employee</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedLeave.profiles?.full_name || 'Unknown User'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Leave Type</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 uppercase">
                    {selectedLeave.leave_type}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Start Date</p>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{new Date(selectedLeave.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">End Date</p>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{new Date(selectedLeave.end_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${
                    selectedLeave.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' :
                    selectedLeave.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' :
                    'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                  }`}>
                    {selectedLeave.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Date Requested</p>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{new Date(selectedLeave.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-4 border border-zinc-200/80 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Reason Provided</p>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">{selectedLeave.reason}</p>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex justify-end gap-2.5">
              <button 
                onClick={() => setSelectedLeave(null)}
                className="px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Close Window
              </button>
              {selectedLeave.status === 'pending' && (
                <>
                  <button 
                    onClick={() => updateLeaveStatus(selectedLeave.id, 'rejected')}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button 
                    onClick={() => updateLeaveStatus(selectedLeave.id, 'approved')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
