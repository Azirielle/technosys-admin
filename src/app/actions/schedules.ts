"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"
import { verifyRoleAccess } from "@/lib/permissions"
import { sendPushNotification } from "@/lib/push"

// Normalize a date string that may be date-only (YYYY-MM-DD) to a full ISO timestamp
// Start dates become 00:00:00 UTC, end dates become 23:59:59 UTC
function normLeaveStart(dateStr: string): number {
  // If already contains time info, use as-is
  if (dateStr.includes('T')) return new Date(dateStr).getTime()
  return new Date(`${dateStr}T00:00:00.000Z`).getTime()
}

function normLeaveEnd(dateStr: string): number {
  if (dateStr.includes('T')) return new Date(dateStr).getTime()
  return new Date(`${dateStr}T23:59:59.999Z`).getTime()
}

// Helper to check if a single time conflicts with a leave range
function isTimeConflictingWithLeave(timeStr: string, leaveStart: string, leaveEnd: string) {
  const t = new Date(timeStr).getTime()
  const start = normLeaveStart(leaveStart)
  const end = normLeaveEnd(leaveEnd)
  return t >= start && t <= end
}

// Helper to check if range overlaps with a leave range
function isRangeOverlappingWithLeave(startStr: string, endStr: string, leaveStart: string, leaveEnd: string) {
  const s = new Date(startStr).getTime()
  const e = new Date(endStr).getTime()
  const lStart = normLeaveStart(leaveStart)
  const lEnd = normLeaveEnd(leaveEnd)
  return s < lEnd && e > lStart
}

export async function createSchedule(formData: FormData) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true)
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." }
    }

    const technicianId = formData.get("technicianId") as string
    const rawSeniorPartnerId = formData.get("seniorPartnerId") as string
    const seniorPartnerId = (rawSeniorPartnerId && rawSeniorPartnerId !== "" && rawSeniorPartnerId !== "none") ? rawSeniorPartnerId : null
    const destinationsStr = formData.get("destinations") as string
    let destinations = []
    
    if (destinationsStr) {
      destinations = JSON.parse(destinationsStr)
    } else {
      const clientName = formData.get("clientName") as string
      const location = formData.get("location") as string
      const geofenceLatStr = formData.get("geofenceLat") as string
      const geofenceLngStr = formData.get("geofenceLng") as string
      const geofenceRadiusStr = formData.get("geofenceRadius") as string
      
      if (clientName && location) {
        destinations = [{
          clientName,
          location,
          geofenceLat: geofenceLatStr ? parseFloat(geofenceLatStr) : null,
          geofenceLng: geofenceLngStr ? parseFloat(geofenceLngStr) : null,
          geofenceRadius: geofenceRadiusStr ? parseInt(geofenceRadiusStr) : 500
        }]
      }
    }
    const startTime = formData.get("startTime") as string
    const endTime = formData.get("endTime") as string // Can be empty / null
    const attendanceMode = (formData.get("attendanceMode") as string) || 'hq'
    const isVip = formData.get("isVip") === "on"
    const trackingMode = (formData.get("trackingMode") as string) || "pacita_hq"
    const allowanceRate = parseFloat(formData.get("allowanceRate") as string || "0")

    // Validate past dates (30 minutes grace period)
    const now = Date.now()
    const startMs = new Date(startTime).getTime()
    if (startMs < now - 1800000) {
      throw new Error("Cannot dispatch assignments to past dates.")
    }

    // 1. Fetch technician profile to get name for activity logs
    const { data: techProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', technicianId)
      .single()
    const techName = techProfile?.full_name || 'Staff'

    const targetIds = [technicianId, seniorPartnerId].filter(Boolean) as string[]

    const { data: leaves, error: leavesErr } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .in('technician_id', targetIds)
      .eq('status', 'approved')

    if (leavesErr) throw leavesErr

    const hasConflict = (targetId: string) => {
      return leaves?.some(leave => {
        if (leave.technician_id !== targetId) return false
        if (endTime) {
          return isRangeOverlappingWithLeave(startTime, endTime, leave.start_date, leave.end_date)
        } else {
          return isTimeConflictingWithLeave(startTime, leave.start_date, leave.end_date)
        }
      })
    }

    if (!isVip && hasConflict(technicianId)) {
      throw new Error(`The selected employee "${techName}" is on approved leave during this schedule's timeframe.`)
    }

    if (!isVip && seniorPartnerId && hasConflict(seniorPartnerId)) {
      throw new Error(`The selected senior partner is on approved leave during this schedule's timeframe.`)
    }

    // 3. Prepare inserts for multiple destinations
    const insertData = destinations.map((dest: any, index: number) => {
      const st = new Date(startTime)
      st.setHours(st.getHours() + index) // Stagger by 1 hour for each subsequent destination
      
      return {
        technician_id: technicianId,
        senior_partner_id: seniorPartnerId,
        client_name: dest.clientName,
        location: dest.location,
        geofence_lat: dest.geofenceLat,
        geofence_lon: dest.geofenceLng,
        geofence_radius: dest.geofenceRadius || 500,
        start_time: st.toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : null,
        attendance_mode: attendanceMode,
        is_vip_hook: isVip
      }
    })

    const { error } = await supabaseAdmin.from('schedules').insert(insertData)
    if (error) throw error

    // Look up target profile and send push notification
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('push_token')
      .eq('id', technicianId)
      .single();
    if (targetProfile?.push_token) {
      await sendPushNotification(
        targetProfile.push_token,
        "New Dispatch Assigned",
        "You have been assigned to a new schedule. Please check dispatches on home screen."
      );
    }

    // 4. Log administrative activity
    const clientLog = destinations.length > 1 ? `${destinations.length} destinations` : `client "${destinations[0]?.clientName}"`
    await logActivity('create_schedule', 'schedule', `Scheduled ${techName} to ${clientLog} (Mode: ${attendanceMode})`)

    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create schedule:", err.message || err)
    return { error: err.message || "Failed to create schedule." }
  }
}

// Bulk Create Schedules Server Action
export async function bulkCreateSchedules(data: {
  staffIds: string[]
  destinations?: any[]
  clientName?: string
  location?: string
  geofenceLat?: number | null
  geofenceLng?: number | null
  geofenceRadius?: number
  startTime: string
  endTime?: string
  attendanceMode: string
  seniorPartnerMap?: Record<string, string> // maps helperId -> seniorPartnerId
  isVip?: boolean
  allowanceRate?: number
}) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true)
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." }
    }

    const { staffIds, destinations: inputDestinations, clientName, location, geofenceLat, geofenceLng, geofenceRadius = 500, startTime, endTime, attendanceMode, seniorPartnerMap = {}, isVip = false, allowanceRate = 0 } = data
    
    let destinations = inputDestinations || []
    if (destinations.length === 0 && clientName && location) {
      destinations = [{
        clientName,
        location,
        geofenceLat: geofenceLat ?? null,
        geofenceLng: geofenceLng ?? null,
        geofenceRadius
      }]
    }

    // Validate past dates (30 minutes grace period)
    const now = Date.now()
    const startMs = new Date(startTime).getTime()
    if (startMs < now - 1800000) {
      return { error: "Cannot dispatch assignments to past dates." }
    }

    if (!staffIds || staffIds.length === 0) {
      return { error: "Please select at least one staff member to schedule." }
    }

    const results = []
    let successCount = 0
    let failureCount = 0

    // Fetch staff names for activity logs
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', staffIds)
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]))

    // Fetch leaves for all selected staff
    const { data: leaves, error: leavesErr } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .in('technician_id', staffIds)
      .eq('status', 'approved')

    if (leavesErr) throw leavesErr

    for (const staffId of staffIds) {
      const staffName = profileMap.get(staffId) || 'Staff'

      // Check conflict
      const staffLeaves = leaves?.filter(l => l.technician_id === staffId) || []
      const hasConflict = staffLeaves.some(leave => {
        if (endTime) {
          return isRangeOverlappingWithLeave(startTime, endTime, leave.start_date, leave.end_date)
        } else {
          return isTimeConflictingWithLeave(startTime, leave.start_date, leave.end_date)
        }
      })

      if (!isVip && hasConflict) {
        results.push({ id: staffId, name: staffName, success: false, error: "On approved leave during this time." })
        failureCount++
        continue
      }

      try {
        const seniorPartnerId = seniorPartnerMap[staffId] || null
        
        const insertData = destinations.map((dest: any, index: number) => {
          const st = new Date(startTime)
          st.setHours(st.getHours() + index)
          return {
            technician_id: staffId,
            client_name: dest.clientName,
            location: dest.location,
            geofence_lat: dest.geofenceLat,
            geofence_lon: dest.geofenceLng,
            geofence_radius: dest.geofenceRadius || 500,
            start_time: st.toISOString(),
            end_time: endTime ? new Date(endTime).toISOString() : null,
            attendance_mode: attendanceMode,
            senior_partner_id: seniorPartnerId,
            is_vip_hook: isVip
          }
        })
        
        await supabaseAdmin.from('schedules').insert(insertData)

        // Look up target profile and send push notification
        const { data: targetProfile } = await supabaseAdmin
          .from('profiles')
          .select('push_token')
          .eq('id', staffId)
          .single();
        if (targetProfile?.push_token) {
          await sendPushNotification(
            targetProfile.push_token,
            "New Dispatch Assigned",
            "You have been assigned to a new schedule. Please check dispatches on home screen."
          );
        }

        results.push({ id: staffId, name: staffName, success: true })
        successCount++
      } catch (e: any) {
        results.push({ id: staffId, name: staffName, success: false, error: e.message || 'Database insert failed' })
        failureCount++
      }
    }

    // Log administrative activity
    const clientLog = destinations.length > 1 ? `${destinations.length} destinations` : `client "${destinations[0]?.clientName}"`
    await logActivity('create_schedule', 'schedule', `Bulk scheduled ${successCount} staff to ${clientLog} (Mode: ${attendanceMode})`)

    revalidatePath("/dashboard/schedules")
    return { success: true, results, successCount, failureCount }
  } catch (err: any) {
    console.error("Bulk create schedules error:", err)
    return { error: err.message || "Failed to process bulk scheduling request." }
  }
}

export async function toggleVipHook(scheduleId: string, currentStatus: boolean) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true)
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." }
    }

    const { data: sched } = await supabaseAdmin.from('schedules').select('client_name').eq('id', scheduleId).single()
    const clientName = sched?.client_name || 'Client'

    const { error } = await supabaseAdmin.from('schedules').update({
      is_vip_hook: !currentStatus
    }).eq('id', scheduleId)

    if (error) throw error

    // Log administrative activity
    await logActivity('toggle_vip', 'schedule', `${!currentStatus ? 'Activated' : 'Deactivated'} VIP Hook for client "${clientName}"`)

    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to toggle VIP hook for schedule ${scheduleId}:`, err.message || err)
    return { error: err.message || "Failed to update schedule status." }
  }
}

export async function createBulkSchedules(data: {
  personnelIds: string[]
  clientName: string
  location: string
  startTime: string
  isVip: boolean
}) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true)
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." }
    }

    const { personnelIds, clientName, location, startTime, isVip } = data

    if (!personnelIds || personnelIds.length === 0) {
      throw new Error("Please select at least one personnel.")
    }
    if (!clientName) throw new Error("Client Name / Job Title is required.")
    if (!location) throw new Error("Location is required.")
    if (!startTime) throw new Error("Start Time is required.")

    // Validate past dates (30 minutes grace period)
    const now = Date.now()
    const startMs = new Date(startTime).getTime()
    if (startMs < now - 1800000) {
      throw new Error("Cannot dispatch assignments to past dates.")
    }

    // 1. Fetch approved leaves for the selected personnelIds to perform conflict checks
    const { error: leavesErr, data: leaves } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .in('technician_id', personnelIds)
      .eq('status', 'approved')

    if (leavesErr) throw leavesErr

    // 2. Validate conflicts
    const conflictingIds = personnelIds.filter(id => 
      leaves?.some(leave => 
        leave.technician_id === id &&
        isTimeConflictingWithLeave(startTime, leave.start_date, leave.end_date)
      )
    )

    if (conflictingIds.length > 0) {
      // Fetch names of conflicting IDs to throw a helpful error
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', conflictingIds)

      const names = profiles?.map(p => p.full_name) || conflictingIds
      throw new Error(`The following personnel are on approved leave during this timeframe: ${names.join(', ')}`)
    }

    // 3. Prepare inserts
    const inserts = personnelIds.map(id => ({
      technician_id: id,
      senior_partner_id: null,
      client_name: clientName,
      location,
      start_time: new Date(startTime).toISOString(),
      end_time: null,
      is_vip_hook: isVip
    }))

    // 4. Insert into DB (All-or-Nothing)
    const { error } = await supabaseAdmin.from('schedules').insert(inserts)
    if (error) throw error

    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create bulk schedules:", err.message || err)
    return { error: err.message || "Failed to create bulk schedules." }
  }
}

export async function updateSchedule(formData: FormData) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true)
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." }
    }

    const scheduleId = formData.get("scheduleId") as string
    const technicianId = formData.get("technicianId") as string
    const rawSeniorPartnerId = formData.get("seniorPartnerId") as string
    const seniorPartnerId = (rawSeniorPartnerId && rawSeniorPartnerId !== "" && rawSeniorPartnerId !== "none") ? rawSeniorPartnerId : null
    const clientName = formData.get("clientName") as string
    const location = formData.get("location") as string
    const startTime = formData.get("startTime") as string
    const endTime = formData.get("endTime") as string // Can be empty / null
    const attendanceMode = (formData.get("attendanceMode") as string) || 'hq'
    const isVip = formData.get("isVip") === "on"
    const allowanceRate = parseFloat(formData.get("allowanceRate") as string || "0")

    if (!scheduleId) {
      throw new Error("Schedule ID is required.")
    }

    // Retrieve original schedule details
    const { data: originalSchedule, error: fetchErr } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()

    if (fetchErr || !originalSchedule) {
      throw new Error("Schedule not found.")
    }

    // 1. Fetch technician profile to get name for activity logs
    const { data: techProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', technicianId)
      .single()
    const techName = techProfile?.full_name || 'Staff'

    const targetIds = [technicianId, seniorPartnerId].filter(Boolean) as string[]

    const { data: leaves, error: leavesErr } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .in('technician_id', targetIds)
      .eq('status', 'approved')

    if (leavesErr) throw leavesErr

    const hasConflict = (targetId: string) => {
      return leaves?.some(leave => {
        if (leave.technician_id !== targetId) return false
        if (endTime) {
          return isRangeOverlappingWithLeave(startTime, endTime, leave.start_date, leave.end_date)
        } else {
          return isTimeConflictingWithLeave(startTime, leave.start_date, leave.end_date)
        }
      })
    }

    if (hasConflict(technicianId)) {
      throw new Error(`The selected employee "${techName}" is on approved leave during this schedule's timeframe.`)
    }

    if (seniorPartnerId && hasConflict(seniorPartnerId)) {
      throw new Error(`The selected senior partner is on approved leave during this schedule's timeframe.`)
    }

    // Update schedule
    const updateData: any = {
      technician_id: technicianId,
      senior_partner_id: seniorPartnerId,
      client_name: clientName,
      location,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      attendance_mode: attendanceMode,
      is_vip_hook: isVip
    }

    const { error: updateErr } = await supabaseAdmin
      .from('schedules')
      .update(updateData)
      .eq('id', scheduleId)

    if (updateErr) throw updateErr

    // Send push notification if technician, location, or start time changed
    const techChanged = originalSchedule.technician_id !== technicianId
    const locationChanged = originalSchedule.location !== location
    const timeChanged = new Date(originalSchedule.start_time).getTime() !== new Date(startTime).getTime()

    if (techChanged || locationChanged || timeChanged) {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('push_token')
        .eq('id', technicianId)
        .single();
      if (targetProfile?.push_token) {
        await sendPushNotification(
          targetProfile.push_token,
          "Dispatch Schedule Updated",
          `Your schedule for client "${clientName}" has been updated.`
        );
      }

      if (techChanged && originalSchedule.technician_id) {
        const { data: oldProfile } = await supabaseAdmin
          .from('profiles')
          .select('push_token')
          .eq('id', originalSchedule.technician_id)
          .single();
        if (oldProfile?.push_token) {
          await sendPushNotification(
            oldProfile.push_token,
            "Dispatch Cancelled",
            `Your assignment for client "${originalSchedule.client_name}" has been reassigned/cancelled.`
          );
        }
      }
    }

    await logActivity('update_schedule', 'schedule', `Updated schedule details for client "${clientName}" (Technician: ${techName})`)

    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to update schedule:", err.message || err)
    return { error: err.message || "Failed to update schedule." }
  }
}

export async function deleteSchedule(scheduleId: string) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true)
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." }
    }

    if (!scheduleId) {
      throw new Error("Schedule ID is required.")
    }

    const { data: sched, error: fetchErr } = await supabaseAdmin
      .from('schedules')
      .select('client_name')
      .eq('id', scheduleId)
      .single()

    const clientName = sched?.client_name || 'Client'

    const { error: deleteErr } = await supabaseAdmin
      .from('schedules')
      .delete()
      .eq('id', scheduleId)

    if (deleteErr) {
      if (deleteErr.code === '23503') {
        return { error: "This schedule cannot be deleted because a technician has already clocked into it or has active DTR records." }
      }
      throw deleteErr
    }

    await logActivity('delete_schedule', 'schedule', `Deleted schedule for client "${clientName}"`)

    revalidatePath("/dashboard/schedules")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to delete schedule:", err.message || err)
    return { error: err.message || "Failed to delete schedule." }
  }
}

