"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { isRangeOverlapping } from "@/lib/utils"

export async function createSchedule(formData: FormData) {
  try {
    const technicianId = formData.get("technicianId") as string
    const rawSeniorPartnerId = formData.get("seniorPartnerId") as string
    const seniorPartnerId = (rawSeniorPartnerId && rawSeniorPartnerId !== "" && rawSeniorPartnerId !== "none") ? rawSeniorPartnerId : null
    const clientName = formData.get("clientName") as string
    const location = formData.get("location") as string
    const startTime = formData.get("startTime") as string
    const isVip = formData.get("isVip") === "on"

    const targetIds = [technicianId, seniorPartnerId].filter(Boolean) as string[]

    const { error: leavesErr, data: leaves } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .in('technician_id', targetIds)
      .eq('status', 'approved')

    if (leavesErr) throw leavesErr

    const hasTechnicianConflict = leaves?.some(leave => 
      leave.technician_id === technicianId &&
      isRangeOverlapping(startTime, null, leave.start_date, leave.end_date)
    )

    if (hasTechnicianConflict) {
      throw new Error("The selected personnel is on approved leave during this schedule's timeframe.")
    }

    if (seniorPartnerId) {
      const hasPartnerConflict = leaves?.some(leave => 
        leave.technician_id === seniorPartnerId &&
        isRangeOverlapping(startTime, null, leave.start_date, leave.end_date)
      )

      if (hasPartnerConflict) {
        throw new Error("The selected senior partner is on approved leave during this schedule's timeframe.")
      }
    }

    const { error } = await supabaseAdmin.from('schedules').insert({
      technician_id: technicianId,
      senior_partner_id: seniorPartnerId,
      client_name: clientName,
      location,
      start_time: new Date(startTime).toISOString(),
      end_time: null,
      is_vip_hook: isVip
    })

    if (error) throw error
    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create schedule:", err.message || err)
    return { error: err.message || "Failed to create schedule." }
  }
}

export async function toggleVipHook(scheduleId: string, currentStatus: boolean) {
  try {
    const { error } = await supabaseAdmin.from('schedules').update({
      is_vip_hook: !currentStatus
    }).eq('id', scheduleId)

    if (error) throw error
    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to toggle VIP hook for schedule ${scheduleId}:`, err.message || err)
    return { error: err.message || "Failed to update schedule status." }
  }
}
