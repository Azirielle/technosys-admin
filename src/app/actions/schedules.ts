"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { isRangeOverlapping } from "@/lib/utils"
import { logActivity } from "./activity"

export async function createSchedule(formData: FormData) {
  try {
    const technicianId = formData.get("technicianId") as string
    const clientName = formData.get("clientName") as string
    const location = formData.get("location") as string
    const startTime = formData.get("startTime") as string
    const endTime = formData.get("endTime") as string
    const isVip = formData.get("isVip") === "on"
    const trackingMode = (formData.get("trackingMode") as string) || "pacita_hq"

    const { error: leavesErr, data: leaves } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .eq('technician_id', technicianId)
      .eq('status', 'approved')

    if (leavesErr) throw leavesErr

    const hasConflict = leaves?.some(leave => 
      isRangeOverlapping(startTime, endTime, leave.start_date, leave.end_date)
    )

    if (hasConflict) {
      throw new Error("The selected technician is on approved leave during this schedule's timeframe.")
    }

    const { error } = await supabaseAdmin.from('schedules').insert({
      technician_id: technicianId,
      client_name: clientName,
      location,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      is_vip_hook: isVip,
      attendance_tracking_mode: trackingMode
    })

    if (error) throw error

    const { data: techProfile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', technicianId).single()
    const techName = techProfile?.full_name || technicianId
    await logActivity({
      category: 'schedules',
      action: 'created',
      description: `Created schedule for client "${clientName}" at "${location}" assigned to ${techName} (DTR Mode: ${trackingMode.replace('_', ' ')})`
    })

    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create schedule:", err.message || err)
    return { error: err.message || "Failed to create schedule." }
  }
}

export async function toggleVipHook(scheduleId: string, currentStatus: boolean) {
  try {
    const { data: sched } = await supabaseAdmin.from('schedules').select('client_name').eq('id', scheduleId).single()

    const { error } = await supabaseAdmin.from('schedules').update({
      is_vip_hook: !currentStatus
    }).eq('id', scheduleId)

    if (error) throw error

    await logActivity({
      category: 'schedules',
      action: 'updated',
      description: `Toggled VIP dispatch status for client "${sched?.client_name || scheduleId}" to ${!currentStatus ? 'Active' : 'Inactive'}`
    })

    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to toggle VIP hook for schedule ${scheduleId}:`, err.message || err)
    return { error: err.message || "Failed to update schedule status." }
  }
}
