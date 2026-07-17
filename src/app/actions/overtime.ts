"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

// 1. Submit OT Request (Technician role)
export async function submitOtRequest(
  technicianId: string,
  dateStr: string,
  hours: number,
  reason: string
) {
  try {
    if (!technicianId || !dateStr || hours <= 0 || !reason.trim()) {
      return { error: "Missing required fields or invalid hours." }
    }

    const { error } = await supabaseAdmin
      .from('overtime_requests')
      .insert({
        technician_id: technicianId,
        request_date: dateStr,
        requested_hours: hours,
        reason: reason.trim(),
        status: 'pending'
      })

    if (error) {
      if (error.message.includes('unique_tech_date_ot')) {
        return { error: "You have already submitted an overtime request for this date." }
      }
      throw error
    }

    revalidatePath("/dashboard/attendance")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to submit overtime request:", err.message || err)
    return { error: err.message || "Failed to submit overtime request." }
  }
}

// 2. Review OT Request (Admin/Coordinator/HR/CEO roles)
export async function reviewOtRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  adminId: string
) {
  try {
    const { authorized } = await verifyRoleAccess('attendance', true)
    if (!authorized) {
      return { error: "Security Restriction: Only administrators can review overtime requests." }
    }

    if (!requestId || !['approved', 'rejected'].includes(status) || !adminId) {
      return { error: "Invalid parameters." }
    }

    const { error } = await supabaseAdmin
      .from('overtime_requests')
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (error) throw error

    revalidatePath("/dashboard/attendance")
    revalidatePath("/dashboard/payroll")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to review overtime request:", err.message || err)
    return { error: err.message || "Failed to review overtime request." }
  }
}

// 3. Get OT Requests (Admin list view)
export async function getOtRequests(status?: string) {
  try {
    const { authorized } = await verifyRoleAccess('attendance', false)
    if (!authorized) return []

    let query = supabaseAdmin
      .from('overtime_requests')
      .select('*, technician:profiles!technician_id(full_name, avatar_url), reviewer:profiles!reviewed_by(full_name)')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch overtime requests:", err.message || err)
    return []
  }
}

// 4. Get Technician's OT Requests (Technician list view)
export async function getTechnicianOtRequests(technicianId: string) {
  try {
    if (!technicianId) return []

    const { data, error } = await supabaseAdmin
      .from('overtime_requests')
      .select('*, reviewer:profiles!reviewed_by(full_name)')
      .eq('technician_id', technicianId)
      .order('request_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch technician overtime requests:", err.message || err)
    return []
  }
}
