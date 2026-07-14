"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { verifyRoleAccess } from "@/lib/permissions"
import { logActivity } from "./activity"

export async function getPendingSelfies() {
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
      .eq('photo_status', 'pending')
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

export async function processSelfieApproval(logId: string, status: 'approved' | 'rejected') {
  try {
    const { authorized, userId } = await verifyRoleAccess('attendance', true) 
    if (!authorized || !userId) {
      return { error: "Unauthorized. You do not have permission to approve attendance photos." }
    }

    const { data: log, error: fetchErr } = await supabaseAdmin
      .from('time_logs')
      .select('technician_id, app_time_in, technician:profiles!technician_id(full_name)')
      .eq('id', logId)
      .single()

    if (fetchErr || !log) {
      return { error: "Time log not found." }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('time_logs')
      .update({ 
        photo_status: status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', logId)

    if (updateErr) throw updateErr

    // Log the activity
    const techName = Array.isArray(log.technician) ? log.technician[0]?.full_name : (log.technician as any)?.full_name || 'Technician'
    await logActivity({
      category: 'compliance',
      action: 'updated',
      description: `${status === 'approved' ? 'Approved' : 'Rejected'} DTR selfie for ${techName} on ${new Date(log.app_time_in).toLocaleDateString()}`
    })

    revalidatePath("/dashboard/attendance")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to process selfie approval:", err.message)
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
