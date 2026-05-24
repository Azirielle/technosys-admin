"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function createSchedule(formData: FormData) {
  const technicianId = formData.get("technicianId") as string
  const clientName = formData.get("clientName") as string
  const location = formData.get("location") as string
  const startTime = formData.get("startTime") as string
  const endTime = formData.get("endTime") as string
  const isVip = formData.get("isVip") === "on"

  const { error } = await supabaseAdmin.from('schedules').insert({
    technician_id: technicianId,
    client_name: clientName,
    location,
    start_time: new Date(startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    is_vip_hook: isVip
  })

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/schedules")
}

export async function toggleVipHook(scheduleId: string, currentStatus: boolean) {
  const { error } = await supabaseAdmin.from('schedules').update({
    is_vip_hook: !currentStatus
  }).eq('id', scheduleId)

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/schedules")
}
