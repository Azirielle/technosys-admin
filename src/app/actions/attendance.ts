"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { verifyRoleAccess } from "@/lib/permissions"
import { logActivity } from "./activity"

export async function getRecentSelfies() {
  try {
    const { data, error } = await supabaseAdmin
      .from('time_logs')
      .select(`
        id,
        app_time_in,
        photo_url,
        photo_status,
        technician_id,
        technician:profiles!technician_id(full_name, role)
      `)
      .neq('photo_status', 'flagged').limit(20)
      .not('photo_url', 'is', null)
      .order('app_time_in', { ascending: false })

    if (error) throw error
    
    const result = await Promise.all((data || []).map(async (record) => {
      let finalUrl = record.photo_url;
      if (finalUrl && !finalUrl.startsWith('http')) {
        const { data: signedData } = await supabaseAdmin.storage.from('dtr-selfies').createSignedUrl(finalUrl, 60 * 60 * 24);
        if (signedData?.signedUrl) {
          finalUrl = signedData.signedUrl;
        }
      }
      return { ...record, photo_url: finalUrl };
    }));

    return result

  } catch (err: any) {
    console.error("Failed to fetch pending selfies:", err.message)
    return []
  }
}

export async function flagSuspiciousSelfie(logId: string) {
  try {
    const { authorized, userId } = await verifyRoleAccess('attendance', true) 
    if (!authorized || !userId) {
      return { error: "Unauthorized. You do not have permission to flag attendance photos." }
    }

    const { error } = await supabaseAdmin
      .from('time_logs')
      .update({ 
        photo_status: 'flagged'
      })
      .eq('id', logId)

    if (error) throw error

    await logActivity(userId, 'attendance_flagged', `Selfie flagged as suspicious for log ${logId}`)

    revalidatePath('/dashboard/attendance')
    return { success: true }
  } catch (err: any) {
    console.error("Selfie flagging failed:", err.message)
    return { error: err.message }
  }
}



export async function getAttendanceHistory() {
  try {
    const { authorized } = await verifyRoleAccess('attendance', false)
    if (!authorized) return []

    const { data, error } = await supabaseAdmin
      .from('time_logs')
      .select(`
        id,
        app_time_in,
        photo_url,
        photo_status,
        reviewed_at,
        technician:profiles!technician_id(full_name),
        reviewer:profiles!reviewed_by(full_name)
      `)
      .in('photo_status', ['approved', 'rejected'])
      .not('photo_url', 'is', null)
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .limit(50)

    if (error) throw error

    const result = await Promise.all((data || []).map(async (record) => {
      let finalUrl = record.photo_url;
      if (finalUrl && !finalUrl.startsWith('http')) {
        const { data: signedData } = await supabaseAdmin.storage.from('dtr-selfies').createSignedUrl(finalUrl, 60 * 60 * 24);
        if (signedData?.signedUrl) {
          finalUrl = signedData.signedUrl;
        }
      }
      return { ...record, photo_url: finalUrl };
    }));

    return result
  } catch (err: any) {
    console.error("Failed to fetch attendance history:", err.message)
    return []
  }
}

export async function getActiveShifts() {
  try {
    const { authorized } = await verifyRoleAccess('attendance', false)
    if (!authorized) return []

    const { data, error } = await supabaseAdmin
      .from('time_logs')
      .select(`
        id,
        app_time_in,
        photo_url,
        photo_status,
        latitude,
        longitude,
        geofence_status,
        technician:profiles!technician_id(id, full_name, role)
      `)
      .is('app_time_out', null)
      .order('app_time_in', { ascending: false })

    if (error) throw error

    const result = await Promise.all((data || []).map(async (record) => {
      let finalUrl = record.photo_url;
      if (finalUrl && !finalUrl.startsWith('http')) {
        const { data: signedData } = await supabaseAdmin.storage.from('dtr-selfies').createSignedUrl(finalUrl, 60 * 60 * 24);
        if (signedData?.signedUrl) {
          finalUrl = signedData.signedUrl;
        }
      }
      return { ...record, photo_url: finalUrl };
    }));

    return result
  } catch (err: any) {
    console.error("Failed to fetch active shifts:", err.message)
    return []
  }
}

export async function clockOutTechnician(logId: string) {
  try {
    const { authorized, userId: adminId } = await verifyRoleAccess('attendance', true)
    if (!authorized || !adminId) {
      return { error: "Unauthorized. You do not have permissions to clock out technicians." }
    }

    const timeOut = new Date().toISOString()

    // Fetch the log first to calculate total_hours
    const { data: log, error: fetchErr } = await supabaseAdmin
      .from('time_logs')
      .select('*, technician:profiles!technician_id(full_name)')
      .eq('id', logId)
      .single()

    if (fetchErr || !log) throw new Error('Time log not found')

    const elapsedMs = new Date(timeOut).getTime() - new Date(log.app_time_in).getTime()
    const hours = Math.max(0, elapsedMs / (1000 * 60 * 60))

    const { error: updateErr } = await supabaseAdmin
      .from('time_logs')
      .update({
        app_time_out: timeOut,
        total_hours: Number(hours.toFixed(2)),
        status: 'closed',
        clocked_out_by: adminId
      })
      .eq('id', logId)

    if (updateErr) throw updateErr

    const techName = log.technician?.full_name || 'Technician'
    await logActivity({
      category: 'attendance',
      action: 'clocked_out',
      description: `Forced clock out for technician ${techName}`
    })

    revalidatePath('/dashboard/attendance')
    return { success: true }
  } catch (err: any) {
    console.error("Force clock out failed:", err.message)
    return { error: err.message || "Force clock out failed" }
  }
}

export async function batchClockOut(logIds: string[]) {
  try {
    const { authorized, userId: adminId } = await verifyRoleAccess('attendance', true)
    if (!authorized || !adminId) {
      return { error: "Unauthorized. You do not have permissions to clock out technicians." }
    }

    const timeOut = new Date().toISOString()
    const { data: logs, error: fetchErr } = await supabaseAdmin
      .from('time_logs')
      .select('id, app_time_in')
      .in('id', logIds)

    if (fetchErr || !logs) throw new Error('Time logs not found')

    for (const log of logs) {
      const elapsedMs = new Date(timeOut).getTime() - new Date(log.app_time_in).getTime()
      const hours = Math.max(0, elapsedMs / (1000 * 60 * 60))

      await supabaseAdmin
        .from('time_logs')
        .update({
          app_time_out: timeOut,
          total_hours: Number(hours.toFixed(2)),
          status: 'closed',
          clocked_out_by: adminId
        })
        .eq('id', log.id)
    }

    await logActivity({
      category: 'attendance',
      action: 'batch_clocked_out',
      description: `Batch clocked out ${logIds.length} technicians`
    })

    revalidatePath('/dashboard/attendance')
    return { success: true }
  } catch (err: any) {
    console.error("Batch clock out failed:", err.message)
    return { error: err.message || "Batch clock out failed" }
  }
}

