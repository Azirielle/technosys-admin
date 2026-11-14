// Shape of one leave request as the HR Leaves page loads it (leaves row + the employee's name).
export type LeaveRecord = {
  id: string
  technician_id?: string
  start_date: string
  end_date: string
  leave_type: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  attachment_url?: string | null
  rejection_reason?: string | null
  profiles?: {
    full_name?: string
    role?: string
  }
}

export type LeaveFilter = 'pending' | 'approved' | 'rejected' | 'all'

export function applicantName(leave: LeaveRecord) {
  return leave.profiles?.full_name || 'Employee'
}
