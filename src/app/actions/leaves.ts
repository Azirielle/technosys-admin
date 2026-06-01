"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { createClient } from '@/lib/supabase/server'

export interface LeaveRequest {
  id: string
  technician_id: string
  start_date: string
  end_date: string
  leave_type: 'sick' | 'vacation' | 'emergency' | 'unpaid'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  technician?: {
    full_name: string
  }
  has_conflicts?: boolean
  conflict_count?: number
}

// 1. Fetch all leaves requests
export async function getLeaves(statusFilter?: string): Promise<LeaveRequest[]> {
  try {
    let query = supabaseAdmin
      .from('leaves')
      .select(`
        *,
        technician:profiles!technician_id(full_name)
      `)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) throw error

    const leavesList = (data || []) as LeaveRequest[]

    // Check for schedule conflicts for each leave request
    const enrichedLeaves = await Promise.all(
      leavesList.map(async (leave) => {
        // Query schedules that overlap with the leave dates
        // Start date starts at 00:00:00 and end date ends at 23:59:59
        const startISO = `${leave.start_date}T00:00:00.000Z`
        const endISO = `${leave.end_date}T23:59:59.999Z`

        const { count, error: schedError } = await supabaseAdmin
          .from('schedules')
          .select('*', { count: 'exact', head: true })
          .eq('technician_id', leave.technician_id)
          .gte('start_time', startISO)
          .lte('start_time', endISO)

        return {
          ...leave,
          has_conflicts: !schedError && count ? count > 0 : false,
          conflict_count: count || 0
        }
      })
    )

    return enrichedLeaves
  } catch (err: any) {
    console.error("Failed to fetch leaves requests:", err.message || err)
    return []
  }
}

// 2. Update a leave request status (Approve / Reject)
export async function updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected') {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return { error: "Authentication required." }
    }

    // Get current user's profile to verify they are an admin or super_admin
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (profileErr || !profile) {
      return { error: "Failed to verify admin status." }
    }

    if (!['admin', 'super_admin'].includes(profile.role)) {
      return { error: "Unauthorized. Admin privileges required to update leaves." }
    }

    const { error } = await supabaseAdmin
      .from('leaves')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', leaveId)

    if (error) throw error

    revalidatePath("/dashboard/leaves")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to update leave status for request ${leaveId}:`, err.message || err)
    return { error: err.message || "Failed to update leave request status." }
  }
}
