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
    const endTime = formData.get("endTime") as string
    const attendanceMode = (formData.get("attendanceMode") as string) || 'direct_dispatch'
    const isVip = formData.get("isVip") === "on"
    const geofenceLat = formData.get("geofenceLat") ? parseFloat(formData.get("geofenceLat") as string) : null
    const geofenceLon = formData.get("geofenceLon") ? parseFloat(formData.get("geofenceLon") as string) : null
    const geofenceRadius = formData.get("geofenceRadius") ? parseInt(formData.get("geofenceRadius") as string) : 500

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

    if (originalSchedule.status === 'cancelled') {
      throw new Error("Cannot edit a cancelled schedule.")
    }

    // Check conflict if technician or dates changed
    if (technicianId) {
      const { data: leaves } = await supabaseAdmin
        .from('leaves')
        .select('*')
        .eq('technician_id', technicianId)
        .eq('status', 'approved')

      const hasConflict = leaves?.some(leave => {
        if (endTime) {
          return isRangeOverlappingWithLeave(startTime, endTime, leave.start_date, leave.end_date)
        } else {
          return isTimeConflictingWithLeave(startTime, leave.start_date, leave.end_date)
        }
      })

      if (hasConflict) {
        throw new Error("The selected technician is on approved leave during this schedule timeframe.")
      }
    }

    const updateData: any = {
      client_name: clientName,
      location,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      attendance_mode: attendanceMode,
      is_vip_hook: isVip,
      updated_at: new Date().toISOString()
    }

    if (technicianId) updateData.technician_id = technicianId
    if (seniorPartnerId !== undefined) updateData.senior_partner_id = seniorPartnerId
    if (geofenceLat !== null && !isNaN(geofenceLat)) updateData.geofence_lat = geofenceLat
    if (geofenceLon !== null && !isNaN(geofenceLon)) updateData.geofence_lon = geofenceLon
    if (geofenceRadius !== null && !isNaN(geofenceRadius)) updateData.geofence_radius = geofenceRadius

    const { error: updateErr } = await supabaseAdmin
      .from('schedules')
      .update(updateData)
      .eq('id', scheduleId)

    if (updateErr) throw updateErr

    // Send push notification to technician if changed or updated
    const targetTechId = technicianId || originalSchedule.technician_id
    if (targetTechId) {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('push_token')
        .eq('id', targetTechId)
        .single();
      if (targetProfile?.push_token) {
        await sendPushNotification(
          targetProfile.push_token,
          "Dispatch Schedule Updated",
          `Your schedule for client "${clientName}" has been updated.`
        );
      }

      if (technicianId && originalSchedule.technician_id && originalSchedule.technician_id !== technicianId) {
        const { data: oldProfile } = await supabaseAdmin
          .from('profiles')
          .select('push_token')
          .eq('id', originalSchedule.technician_id)
          .single();
        if (oldProfile?.push_token) {
          await sendPushNotification(
            oldProfile.push_token,
            "Dispatch Reassigned",
            `Your assignment for client "${originalSchedule.client_name}" has been transferred.`
          );
        }
      }
    }

    await logActivity('update_schedule', 'schedule', `Updated schedule details for client "${clientName}"`)

    revalidatePath("/coordinator")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to update schedule:", err.message || err)
    return { error: err.message || "Failed to update schedule." }
  }
}

export async function reassignSchedule(scheduleId: string, newTechnicianId: string, seniorPartnerId: string | null, reason?: string) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true)
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." }
    }

    if (!scheduleId || !newTechnicianId) {
      throw new Error("Schedule ID and new technician are required.")
    }

    const { data: originalSchedule, error: fetchErr } = await supabaseAdmin
      .from('schedules')
      .select('*, profiles!technician_id(full_name)')
      .eq('id', scheduleId)
      .single()

    if (fetchErr || !originalSchedule) {
      throw new Error("Schedule not found.")
    }

    if (originalSchedule.status === 'cancelled') {
      throw new Error("Cannot reassign a cancelled schedule.")
    }

    // Check if new technician has approved leave conflict
    const { data: leaves } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .eq('technician_id', newTechnicianId)
      .eq('status', 'approved')

    const hasConflict = leaves?.some(leave => {
      if (originalSchedule.end_time) {
        return isRangeOverlappingWithLeave(originalSchedule.start_time, originalSchedule.end_time, leave.start_date, leave.end_date)
      } else {
        return isTimeConflictingWithLeave(originalSchedule.start_time, leave.start_date, leave.end_date)
      }
    })

    if (hasConflict) {
      throw new Error("The selected replacement technician is on approved leave during this schedule timeframe.")
    }

    // Fetch names, role, and level for validation, logging, and push
    const { data: newTechProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, push_token, role, technician_level')
      .eq('id', newTechnicianId)
      .single()

    if (!newTechProfile) {
      throw new Error("Replacement technician not found.")
    }

    if (newTechProfile.role !== 'technician' && newTechProfile.role !== 'helper') {
      throw new Error(`Role Restriction: Cannot dispatch administrative personnel (${newTechProfile.full_name} - ${newTechProfile.role}). Only field staff can be assigned.`)
    }

    if ((newTechProfile.role === 'helper' || newTechProfile.technician_level === 'helper') && !seniorPartnerId) {
      throw new Error("Operational Hierarchy: A Helper cannot be assigned as a solo lead technician. Please select an accompanying Senior or Standard Technician.")
    }

    const newTechName = newTechProfile?.full_name || 'Staff'
    const oldTechName = (originalSchedule.profiles as any)?.full_name || 'Staff'

    const { error: updateErr } = await supabaseAdmin
      .from('schedules')
      .update({
        technician_id: newTechnicianId,
        senior_partner_id: seniorPartnerId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId)

    if (updateErr) throw updateErr

    // Notify old technician
    if (originalSchedule.technician_id) {
      const { data: oldProfile } = await supabaseAdmin
        .from('profiles')
        .select('push_token')
        .eq('id', originalSchedule.technician_id)
        .single()

      if (oldProfile?.push_token) {
        await sendPushNotification(
          oldProfile.push_token,
          "Dispatch Reassigned",
          `Your assignment for "${originalSchedule.client_name}" has been transferred to ${newTechName}.${reason ? ` Reason: ${reason}` : ''}`
        )
      }
    }

    // Notify new technician
    if (newTechProfile?.push_token) {
      await sendPushNotification(
        newTechProfile.push_token,
        "New Dispatch Assigned",
        `You have been assigned to client "${originalSchedule.client_name}".`
      )
    }

    await logActivity('reassign_schedule', 'schedule', `Reassigned schedule for "${originalSchedule.client_name}" from ${oldTechName} to ${newTechName}${reason ? ` (${reason})` : ''}`)
    revalidatePath("/coordinator")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to reassign schedule:", err.message || err)
    return { error: err.message || "Failed to reassign schedule." }
  }
}

export async function cancelSchedule(scheduleId: string, reason: string) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true)
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." }
    }

    if (!scheduleId) {
      throw new Error("Schedule ID is required.")
    }

    if (!reason || !reason.trim()) {
      throw new Error("A mandatory cancellation reason is required.")
    }

    const { data: originalSchedule, error: fetchErr } = await supabaseAdmin
      .from('schedules')
      .select('*, profiles!technician_id(full_name, push_token)')
      .eq('id', scheduleId)
      .single()

    if (fetchErr || !originalSchedule) {
      throw new Error("Schedule not found.")
    }

    const { error: updateErr } = await supabaseAdmin
      .from('schedules')
      .update({
        status: 'cancelled',
        cancellation_reason: reason.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId)

    if (updateErr) throw updateErr

    // Send push notification to technician if assigned
    const techProfile = originalSchedule.profiles as any
    if (techProfile?.push_token) {
      await sendPushNotification(
        techProfile.push_token,
        "Dispatch Cancelled",
        `Your schedule for "${originalSchedule.client_name}" has been cancelled. Reason: ${reason.trim()}`
      )
    }

    await logActivity('cancel_schedule', 'schedule', `Cancelled dispatch for "${originalSchedule.client_name}". Reason: ${reason.trim()}`)
    revalidatePath("/coordinator")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to cancel schedule:", err.message || err)
    return { error: err.message || "Failed to cancel schedule." }
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

// ---------------------------------------------------------------------------
// Chunk 50: FSM Hierarchy Dispatch with Support Crew & Casual Helpers
// ---------------------------------------------------------------------------

export async function createDispatchesWithCrew(data: {
  leadTechnicianId: string;
  helperTechnicianIds?: string[];
  casualHelperIds?: string[];
  clientName: string;
  location: string;
  date: string;
  startTime: string;
  endTime?: string;
  attendanceMode: string;
  geofenceLat: number;
  geofenceLon: number;
  geofenceRadius: number;
  attendanceTrackingMode?: string;
}) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true);
    if (!authorized) {
      return { error: "Unauthorized. Scheduling write permissions required." };
    }

    const {
      leadTechnicianId,
      helperTechnicianIds = [],
      casualHelperIds = [],
      clientName,
      location,
      date,
      startTime: rawStartTime,
      endTime: rawEndTime,
      attendanceMode,
      geofenceLat,
      geofenceLon,
      geofenceRadius = 500,
      attendanceTrackingMode
    } = data;

    if (!leadTechnicianId) {
      return { error: "A Lead Technician is required for this dispatch." };
    }
    if (!clientName || !clientName.trim()) {
      return { error: "Client / Assignment name is required." };
    }

    const fullStartTime = new Date(`${date}T${rawStartTime}:00`).toISOString();
    const fullEndTime = rawEndTime ? new Date(`${date}T${rawEndTime}:00`).toISOString() : null;

    // Validate past dates (30 minutes grace period)
    const now = Date.now();
    const startMs = new Date(fullStartTime).getTime();
    if (startMs < now - 1800000) {
      return { error: "Cannot dispatch assignments to past dates." };
    }

    // 1. Fetch lead technician profile
    const { data: leadProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, technician_level, push_token')
      .eq('id', leadTechnicianId)
      .single();

    if (!leadProfile) {
      return { error: "Lead technician not found." };
    }

    // Role whitelisting: Reject admin accounts
    if (leadProfile.role !== 'technician') {
      return { error: `Role Restriction: ${leadProfile.full_name} has role "${leadProfile.role}". Only field technicians can be assigned as Lead.` };
    }

    // Operational Hierarchy: A helper cannot be designated as lead
    if (leadProfile.technician_level === 'helper' || leadProfile.role === 'helper') {
      return { error: "Operational Hierarchy: A Helper cannot be designated as Lead Technician. Please select a Senior or Standard Technician." };
    }

    // 2. Leave conflict check
    const targetIds = [leadTechnicianId, ...helperTechnicianIds];
    const { data: leaves, error: leavesErr } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .in('technician_id', targetIds)
      .eq('status', 'approved');

    if (leavesErr) throw leavesErr;

    const hasConflict = (tid: string) => {
      return leaves?.some(l => {
        if (l.technician_id !== tid) return false;
        if (fullEndTime) {
          return isRangeOverlappingWithLeave(fullStartTime, fullEndTime, l.start_date, l.end_date);
        } else {
          return isTimeConflictingWithLeave(fullStartTime, l.start_date, l.end_date);
        }
      });
    };

    if (hasConflict(leadTechnicianId)) {
      return { error: `Lead technician "${leadProfile.full_name}" is on approved leave during this schedule timeframe.` };
    }

    // 3. Insert Lead Technician Schedule
    const leadInsert = {
      technician_id: leadTechnicianId,
      senior_partner_id: null,
      client_name: clientName.trim(),
      location: location.trim(),
      start_time: fullStartTime,
      end_time: fullEndTime,
      attendance_mode: attendanceMode,
      geofence_lat: geofenceLat,
      geofence_lon: geofenceLon,
      geofence_radius: geofenceRadius,
      attendance_tracking_mode: attendanceTrackingMode || (attendanceMode === 'hq' ? 'pacita_hq' : 'direct_on_site'),
      status: 'scheduled'
    };

    const { data: createdLeadSchedule, error: leadSchedErr } = await supabaseAdmin
      .from('schedules')
      .insert(leadInsert)
      .select('id')
      .single();

    if (leadSchedErr || !createdLeadSchedule) {
      throw leadSchedErr || new Error("Failed to create lead technician schedule.");
    }

    const leadScheduleId = createdLeadSchedule.id;

    // 4. Insert Helper Technicians (if any) with senior_partner_id = leadTechnicianId
    if (helperTechnicianIds.length > 0) {
      const { data: helperProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, push_token')
        .in('id', helperTechnicianIds);

      const helperInserts = helperTechnicianIds.map(hId => {
        const hProf = helperProfiles?.find(p => p.id === hId);
        if (hProf && hProf.role !== 'technician' && hProf.role !== 'helper') {
          throw new Error(`Cannot assign administrative staff member "${hProf.full_name}" (${hProf.role}) as helper.`);
        }
        if (hasConflict(hId)) {
          throw new Error(`Helper "${hProf?.full_name || hId}" is on approved leave.`);
        }

        return {
          technician_id: hId,
          senior_partner_id: leadTechnicianId,
          client_name: clientName.trim(),
          location: location.trim(),
          start_time: fullStartTime,
          end_time: fullEndTime,
          attendance_mode: attendanceMode,
          geofence_lat: geofenceLat,
          geofence_lon: geofenceLon,
          geofence_radius: geofenceRadius,
          attendance_tracking_mode: attendanceTrackingMode || (attendanceMode === 'hq' ? 'pacita_hq' : 'direct_on_site'),
          status: 'scheduled'
        };
      });

      const { error: helperErr } = await supabaseAdmin
        .from('schedules')
        .insert(helperInserts);

      if (helperErr) throw helperErr;

      // Push notification to helpers
      for (const hProf of helperProfiles || []) {
        if (hProf.push_token) {
          await sendPushNotification(
            hProf.push_token,
            "New Field Dispatch",
            `You are assigned to support Lead Tech ${leadProfile.full_name} at "${clientName.trim()}".`
          );
        }
      }
    }

    // 5. Insert Casual Helpers (if any) linked to the lead schedule
    if (casualHelperIds.length > 0) {
      const casualInserts = casualHelperIds.map(chId => ({
        schedule_id: leadScheduleId,
        casual_helper_id: chId
      }));

      const { error: chErr } = await supabaseAdmin
        .from('schedule_casual_helpers')
        .insert(casualInserts);

      if (chErr) {
        console.error("Failed to link casual helpers:", chErr);
      }
    }

    // Push notification to lead technician
    if (leadProfile.push_token) {
      const crewCount = helperTechnicianIds.length + casualHelperIds.length;
      await sendPushNotification(
        leadProfile.push_token,
        "New Dispatch Assigned",
        `You are Lead Technician for "${clientName.trim()}"${crewCount > 0 ? ` with ${crewCount} crew members` : ''}.`
      );
    }

    // Log Activity
    const crewSummary = `${helperTechnicianIds.length} regular helpers, ${casualHelperIds.length} casual helpers`;
    await logActivity(
      'create_schedule',
      'schedule',
      `Dispatched Lead ${leadProfile.full_name} to "${clientName.trim()}" (Crew: ${crewSummary})`
    );

    revalidatePath("/coordinator");
    return { success: true, scheduleId: leadScheduleId };
  } catch (err: any) {
    console.error("Failed to create dispatches with crew:", err.message || err);
    return { error: err.message || "Failed to create dispatches with crew." };
  }
}

// ---------------------------------------------------------------------------
// Casual Helpers Register Actions
// ---------------------------------------------------------------------------

export async function getCasualHelpers() {
  try {
    const { data, error } = await supabaseAdmin
      .from('casual_helpers')
      .select('*, schedule_casual_helpers(id)')
      .order('full_name');

    if (error) throw error;

    return {
      success: true,
      helpers: (data || []).map((ch: any) => ({
        id: ch.id,
        full_name: ch.full_name,
        contact_number: ch.contact_number,
        daily_rate: Number(ch.daily_rate) || 610.00,
        emergency_contact: ch.emergency_contact,
        notes: ch.notes,
        status: ch.status,
        created_at: ch.created_at,
        dispatch_count: ch.schedule_casual_helpers ? ch.schedule_casual_helpers.length : 0
      }))
    };
  } catch (err: any) {
    console.error("Failed to get casual helpers:", err.message || err);
    return { error: err.message || "Failed to get casual helpers." };
  }
}

export async function createCasualHelper(data: {
  fullName: string;
  contactNumber: string;
  dailyRate?: number;
  emergencyContact?: string;
  notes?: string;
}) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true);
    if (!authorized) {
      return { error: "Unauthorized. Coordinator permissions required." };
    }

    if (!data.fullName || !data.fullName.trim()) {
      return { error: "Full name is required." };
    }
    if (!data.contactNumber || !data.contactNumber.trim()) {
      return { error: "Contact phone number is required." };
    }

    const { data: created, error } = await supabaseAdmin
      .from('casual_helpers')
      .insert({
        full_name: data.fullName.trim(),
        contact_number: data.contactNumber.trim(),
        daily_rate: data.dailyRate && !isNaN(data.dailyRate) ? data.dailyRate : 610.00,
        emergency_contact: data.emergencyContact?.trim() || null,
        notes: data.notes?.trim() || null,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(
      'create_casual_helper',
      'casual_helpers',
      `Registered casual worker "${data.fullName.trim()}" (Daily Rate: ₱${data.dailyRate || 610})`
    );

    revalidatePath("/coordinator");
    return { success: true, helper: created };
  } catch (err: any) {
    console.error("Failed to create casual helper:", err.message || err);
    return { error: err.message || "Failed to register casual helper." };
  }
}

export async function updateCasualHelper(id: string, data: {
  fullName?: string;
  contactNumber?: string;
  dailyRate?: number;
  emergencyContact?: string;
  notes?: string;
  status?: 'active' | 'inactive' | 'blacklisted';
}) {
  try {
    const { authorized } = await verifyRoleAccess('schedules', true);
    if (!authorized) {
      return { error: "Unauthorized. Coordinator permissions required." };
    }

    if (!id) return { error: "Helper ID is required." };

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (data.fullName !== undefined) updatePayload.full_name = data.fullName.trim();
    if (data.contactNumber !== undefined) updatePayload.contact_number = data.contactNumber.trim();
    if (data.dailyRate !== undefined && !isNaN(data.dailyRate)) updatePayload.daily_rate = data.dailyRate;
    if (data.emergencyContact !== undefined) updatePayload.emergency_contact = data.emergencyContact?.trim() || null;
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;
    if (data.status !== undefined) updatePayload.status = data.status;

    const { error } = await supabaseAdmin
      .from('casual_helpers')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    await logActivity('update_casual_helper', 'casual_helpers', `Updated details for casual worker ID ${id}`);
    revalidatePath("/coordinator");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update casual helper:", err.message || err);
    return { error: err.message || "Failed to update casual helper." };
  }
}

export async function toggleCasualHelperStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateCasualHelper(id, { status: newStatus as any });
}


