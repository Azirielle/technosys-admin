'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Filter, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, XCircle, User, Box } from 'lucide-react'

type ToolAssignment = {
  id: string
  handed_over_at: string
  returned_at: string | null
  status: string
  notes: string | null
  profiles?: { full_name: string }
  tool_catalog?: { name: string }
}

export default function InventoryLedgerPage() {
  const [assignments, setAssignments] = useState<ToolAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('checked_out') // Default to active liabilities
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedAssignment, setSelectedAssignment] = useState<ToolAssignment | null>(null)
  
  const itemsPerPage = 5
  const supabase = createClient()

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tool_handovers')
      .select('*, profiles!technician_id(full_name), tool_catalog!tool_id(name)')
      .order('handed_over_at', { ascending: false })
    
    if (data) setAssignments(data as any)
    setLoading(false)
  }

  const updateStatus = async (id: string, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const updateData: any = { status: newStatus }
    if (newStatus !== 'checked_out') {
      updateData.returned_at = new Date().toISOString()
    }
    
    await supabase.from('tool_handovers').update(updateData).eq('id', id)
    fetchAssignments()
    if (selectedAssignment?.id === id) {
      setSelectedAssignment({ ...selectedAssignment, status: newStatus, returned_at: updateData.returned_at || null })
    }
  }

  const getDaysBorrowed = (borrowedAt: string, returnedAt: string | null) => {
    const end = returnedAt ? new Date(returnedAt) : new Date()
    const start = new Date(borrowedAt)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredAssignments = assignments.filter(a => {
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      (a.tool_catalog?.name?.toLowerCase() || '').includes(searchLower) || 
      (a.profiles?.full_name?.toLowerCase() || '').includes(searchLower) ||
      a.id.toLowerCase().includes(searchLower)
      
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage)
  const paginatedAssignments = filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_out': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'returned': return 'bg-green-100 text-green-800 border-green-200'
      case 'lost': return 'bg-red-100 text-red-800 border-red-200'
      case 'damaged': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-none mb-1">Inventory Ledger</h1>
          <p className="text-xs text-gray-500">Track tool assignments, liabilities, and conditions.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden flex flex-col flex-1 pb-6">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-300 bg-gray-50 flex flex-wrap gap-4 items-center justify-start">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tools or technicians..."
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
              <option value="all">All Assignments</option>
              <option value="checked_out">Active (Borrowed)</option>
              <option value="returned">Returned</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>
        
        {/* Data Table */}
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Asset / Tool</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned Tech</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Duration / Aging</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="border border-gray-300 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-6 py-12 text-center text-gray-500">Loading ledger...</td>
                </tr>
              ) : paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-6 py-12 text-center text-gray-500">No assignments match your filters.</td>
                </tr>
              ) : (
                paginatedAssignments.map((a) => {
                  const days = getDaysBorrowed(a.handed_over_at, a.returned_at)
                  const isOverdue = a.status === 'checked_out' && days > 3
                  
                  return (
                    <tr 
                      key={a.id} 
                      onClick={() => setSelectedAssignment(a)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                    >
                      <td className="border border-gray-300 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                            <Box className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-mono text-gray-500 mb-0.5">#{a.id.split('-')[0].toUpperCase()}</span>
                            <span className="text-sm font-bold text-gray-900">{a.tool_catalog?.name || 'Unknown Item'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="h-3 w-3 text-indigo-700" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{a.profiles?.full_name || 'Unknown Tech'}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-sm font-medium text-gray-900">{new Date(a.handed_over_at).toLocaleDateString()}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${isOverdue ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {days} DAYS {a.status === 'checked_out' ? 'OUT' : 'TOTAL'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold ${getStatusBadge(a.status)}`}>
                          {a.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-4 whitespace-nowrap text-center">
                        {a.status === 'checked_out' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={(e) => updateStatus(a.id, 'returned', e)}
                              className="p-1.5 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white rounded border border-green-200 transition-colors shadow-sm"
                              title="Mark Returned"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => updateStatus(a.id, 'damaged', e)}
                              className="p-1.5 bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white rounded border border-orange-200 transition-colors shadow-sm"
                              title="Mark Damaged"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => updateStatus(a.id, 'lost', e)}
                              className="p-1.5 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded border border-red-200 transition-colors shadow-sm"
                              title="Mark Lost"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm font-medium">Closed</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-300 flex items-center justify-between mt-auto">
          <p className="text-sm text-gray-700">
            Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAssignments.length) || 0}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredAssignments.length)}</span> of <span className="font-semibold">{filteredAssignments.length}</span> results
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

        {/* Modal */}
        {selectedAssignment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" onClick={() => setSelectedAssignment(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assignment Details</h2>
                  <p className="text-sm text-gray-500 font-mono mt-1">ID: {selectedAssignment.id}</p>
                </div>
                <button onClick={() => setSelectedAssignment(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tool/Asset</p>
                  <p className="text-base font-medium text-gray-900">{selectedAssignment.tool_catalog?.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Technician</p>
                  <p className="text-base font-medium text-gray-900">{selectedAssignment.profiles?.full_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Borrowed At</p>
                  <p className="text-base font-medium text-gray-900">{new Date(selectedAssignment.handed_over_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Returned At</p>
                  <p className="text-base font-medium text-gray-900">{selectedAssignment.returned_at ? new Date(selectedAssignment.returned_at).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded border text-sm font-bold ${getStatusBadge(selectedAssignment.status)}`}>
                    {selectedAssignment.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-base font-medium text-gray-900">{getDaysBorrowed(selectedAssignment.handed_over_at, selectedAssignment.returned_at)} Days</p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedAssignment(null)}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
