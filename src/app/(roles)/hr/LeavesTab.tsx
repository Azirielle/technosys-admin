'use client'

import Pagination from '@/components/ui/Pagination'
import {
  TableContainer,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmptyState,
  StatusDot,
  MutedBadge
} from '@/components/ui/DataTable'
import ModalDialog from '@/components/ui/ModalDialog'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Search, Filter, ChevronLeft, ChevronRight, User, CalendarOff } from 'lucide-react'

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
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-none border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex-1 flex flex-col h-full">
      {/* Toolbar - Search and Filter */}
      <div className="px-3.5 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex flex-wrap gap-2.5 items-center justify-start shrink-0">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search leaves by name or reason..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="block w-full pl-8 pr-3 py-1.5 border border-zinc-200/80 dark:border-zinc-700 rounded-md text-xs leading-5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="block w-full sm:w-auto pl-2 pr-7 py-1.5 text-xs font-medium border border-zinc-200/80 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
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
        <Table fixed>
          <TableHead sticky>
            <TableRow className="h-8">
              <TableHeaderCell width="32%">Issuer & Reason</TableHeaderCell>
              <TableHeaderCell width="18%">Leave Type</TableHeaderCell>
              <TableHeaderCell width="22%">Duration</TableHeaderCell>
              <TableHeaderCell width="14%">Status</TableHeaderCell>
              <TableHeaderCell width="14%" align="right" noDivider>Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLeaves.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                icon={CalendarOff}
                title="No leave requests found"
                description={searchQuery || statusFilter !== 'all' ? "Try adjusting your search query or status filter." : "No technician leave requests have been logged yet."}
              />
            ) : (
              paginatedLeaves.map((leave) => {
                const isSelected = selectedLeave?.id === leave.id;
                const statusType = leave.status === 'approved' ? 'active' : leave.status === 'rejected' ? 'danger' : 'warning';
                const statusLabel = leave.status.charAt(0).toUpperCase() + leave.status.slice(1);

                return (
                  <TableRow 
                    key={leave.id} 
                    onClick={() => setSelectedLeave(leave)}
                    selected={isSelected}
                  >
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                          <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{leave.profiles?.full_name || 'Unknown User'}</span>
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{leave.reason}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <MutedBadge>
                        {leave.leave_type}
                      </MutedBadge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        <span>{new Date(leave.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <span className="text-zinc-400 dark:text-zinc-500 mx-1">—</span>
                        <span>{new Date(leave.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusDot
                        status={statusType}
                        label={statusLabel}
                      />
                    </TableCell>
                    <TableCell align="right" noDivider>
                      {leave.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => updateLeaveStatus(leave.id, 'approved', e)}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[11px] font-medium transition-colors duration-75 cursor-pointer"
                            title="Approve leave request"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button 
                            onClick={(e) => updateLeaveStatus(leave.id, 'rejected', e)}
                            className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700 hover:border-rose-200 dark:hover:border-rose-800 px-2 py-0.5 rounded text-[11px] font-medium transition-colors duration-75 cursor-pointer"
                            title="Reject leave request"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-mono">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="border-t border-zinc-200/80 dark:border-zinc-800 shrink-0">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredLeaves.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemNamePlural="leave requests"
        />
      </div>

      {/* Detail Modal */}
      <ModalDialog
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        title="Leave Request Details"
        subtitle={selectedLeave ? `ID: #${selectedLeave.id.slice(0, 8).toUpperCase()}` : undefined}
        icon={CalendarOff}
        iconVariant="blue"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setSelectedLeave(null)}
              className="px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Close Window
            </button>
            {selectedLeave?.status === 'pending' && (
              <>
                <button
                  onClick={() => updateLeaveStatus(selectedLeave.id, 'rejected')}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={() => updateLeaveStatus(selectedLeave.id, 'approved')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
              </>
            )}
          </div>
        }
      >
        {selectedLeave && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Employee</p>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{selectedLeave.profiles?.full_name || 'Unknown User'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Leave Type</p>
                <MutedBadge>{selectedLeave.leave_type}</MutedBadge>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Start Date</p>
                <p className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{new Date(selectedLeave.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">End Date</p>
                <p className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{new Date(selectedLeave.end_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Status</p>
                <StatusDot
                  status={selectedLeave.status === 'approved' ? 'active' : selectedLeave.status === 'rejected' ? 'danger' : 'warning'}
                  label={selectedLeave.status.charAt(0).toUpperCase() + selectedLeave.status.slice(1)}
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Date Requested</p>
                <p className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{new Date(selectedLeave.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-3 border border-zinc-200/80 dark:border-zinc-800">
              <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Reason Provided</p>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">{selectedLeave.reason}</p>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  )
}
