'use client'

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

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading leave requests...</div>

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
            placeholder="Search leaves by name or reason..."
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      
      {/* Data Table with strict grid borders and unified column widths */}
      <div className="overflow-auto flex-1">
        <table className="min-w-full border-collapse border border-gray-300 table-fixed">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[32%]">Issuer & Reason</th>
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[18%]">Leave Type</th>
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[22%]">Duration</th>
              <th className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[14%]">Status</th>
              <th className="border border-gray-300 px-4 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-[14%]">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedLeaves.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-gray-300 px-6 py-12 text-center text-gray-500">No leave requests match your filters.</td>
              </tr>
            ) : (
              paginatedLeaves.map((leave) => (
                <tr 
                  key={leave.id} 
                  onClick={() => setSelectedLeave(leave)}
                  className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                >
                  <td className="border border-gray-300 px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {leave.profiles?.full_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{leave.reason}</span>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {leave.leave_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col text-sm text-gray-900 font-medium">
                      <span>{new Date(leave.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span className="text-xs text-gray-500">to {new Date(leave.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold ${
                      leave.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                      leave.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {leave.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2.5 whitespace-nowrap text-center">
                    {leave.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={(e) => updateLeaveStatus(leave.id, 'approved', e)}
                          className="inline-flex items-center gap-1 bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 rounded font-medium transition-colors shadow-sm text-xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button 
                          onClick={(e) => updateLeaveStatus(leave.id, 'rejected', e)}
                          className="inline-flex items-center gap-1 bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded font-medium transition-colors shadow-sm text-xs"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm font-medium">Processed</span>
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
          Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredLeaves.length)}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredLeaves.length)}</span> of <span className="font-semibold">{filteredLeaves.length}</span> results
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
      {selectedLeave && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" onClick={() => setSelectedLeave(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Leave Request Details</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">ID: {selectedLeave.id}</p>
              </div>
              <button onClick={() => setSelectedLeave(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employee</p>
                  <p className="text-base font-medium text-gray-900">{selectedLeave.profiles?.full_name || 'Unknown User'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Leave Type</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {selectedLeave.leave_type.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</p>
                  <p className="text-base font-medium text-gray-900">{new Date(selectedLeave.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</p>
                  <p className="text-base font-medium text-gray-900">{new Date(selectedLeave.end_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded border text-sm font-bold ${
                    selectedLeave.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                    selectedLeave.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    {selectedLeave.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Requested</p>
                  <p className="text-base font-medium text-gray-900">{new Date(selectedLeave.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Reason Provided</p>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedLeave.reason}</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={() => setSelectedLeave(null)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Close Window
              </button>
              {selectedLeave.status === 'pending' && (
                <>
                  <button 
                    onClick={() => updateLeaveStatus(selectedLeave.id, 'rejected')}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2"
                  >
                    <X className="w-5 h-5" /> Reject
                  </button>
                  <button 
                    onClick={() => updateLeaveStatus(selectedLeave.id, 'approved')}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" /> Approve
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
