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
