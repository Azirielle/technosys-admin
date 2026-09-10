"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"

export interface CorrectPunchInput {
  timeLogId?: string | null
  technicianId: string
  targetDate: string // 'YYYY-MM-DD'
  timeIn: string // ISO string or 'YYYY-MM-DDTHH:mm:00+08:00'
  timeOut: string // ISO string or 'YYYY-MM-DDTHH:mm:00+08:00'
  reason: string
}

export interface CorrectionHistoryRecord {
  id: string
  time_log_id: string | null
  technician_id: string
  target_date: string
  correction_type: 'update_punch' | 'insert_missing_shift' | 'excuse_absence'
  original_time_in: string | null
  original_time_out: string | null
  corrected_time_in: string
  corrected_time_out: string
  reason: string
  corrected_by: string
  actor_role: string
  actor_name?: string
  created_at: string
}

/**
 * Validates authenticated user role for DTR audit modifications
 */
async function getAuthorizedActor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized. Please log in to adjust attendance records.")

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error("Unable to resolve authenticated user profile.")
  }

  const allowedRoles = ['accountant', 'hr', 'ceo', 'super_admin']
  if (!allowedRoles.includes(profile.role)) {
    throw new Error(`Forbidden. Role '${profile.role}' is not authorized to execute DTR audit corrections.`)
  }

  return { user, profile }
}

/**
 * Creates or updates an auditable DTR punch record in time_logs and time_log_corrections
 */
export async function correctTimeLogPunch(
  input: CorrectPunchInput
): Promise<{ success: boolean; error?: string; timeLogId?: string }> {
  try {
    const { user, profile } = await getAuthorizedActor()

    // 1. Validate Input Data
    const trimmedReason = (input.reason || '').trim()
    if (trimmedReason.length < 10) {
      return {
        success: false,
        error: "Substantive audit rationale required. Reason must be at least 10 characters detailing why this correction was necessary."
      }
    }

    const inDate = new Date(input.timeIn)
    const outDate = new Date(input.timeOut)

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
      return { success: false, error: "Invalid punch timestamps provided." }
    }

    if (outDate.getTime() <= inDate.getTime()) {
      return { success: false, error: "Clock-out timestamp must be chronologically after clock-in timestamp." }
    }

    // 2. DOLE Net Hours calculation (deduct 1h unpaid meal break if shift > 5 hours)
    const grossHours = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60)
    const netHours = grossHours > 5 ? Math.max(0, grossHours - 1) : grossHours

    let effectiveTimeLogId = input.timeLogId
    let originalTimeIn: string | null = null
    let originalTimeOut: string | null = null
    let correctionType: 'update_punch' | 'insert_missing_shift' = 'update_punch'

    // 3. Update existing time log or insert new shift
    if (effectiveTimeLogId) {
      const { data: existingLog, error: fetchErr } = await supabaseAdmin
        .from('time_logs')
        .select('*')
        .eq('id', effectiveTimeLogId)
        .single()

      if (fetchErr || !existingLog) {
        return { success: false, error: "Target time log record could not be found." }
      }

      originalTimeIn = existingLog.app_time_in
      originalTimeOut = existingLog.app_time_out

      const { error: updateErr } = await supabaseAdmin
        .from('time_logs')
        .update({
          app_time_in: inDate.toISOString(),
          app_time_out: outDate.toISOString(),
          total_hours: Number(netHours.toFixed(2)),
          is_manual_entry: true,
          status: 'closed',
          clocked_out_by: user.id
        })
        .eq('id', effectiveTimeLogId)

      if (updateErr) throw updateErr
    } else {
      correctionType = 'insert_missing_shift'

      const { data: newLog, error: insertErr } = await supabaseAdmin
        .from('time_logs')
        .insert({
          technician_id: input.technicianId,
          app_time_in: inDate.toISOString(),
          app_time_out: outDate.toISOString(),
          total_hours: Number(netHours.toFixed(2)),
          is_manual_entry: true,
          status: 'closed',
          clocked_out_by: user.id,
          geofence_status: 'manual_override'
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr
      effectiveTimeLogId = newLog.id
    }

    // 4. Record Immutable Audit Correction in public.time_log_corrections
    const { error: correctionErr } = await supabaseAdmin
      .from('time_log_corrections')
      .insert({
        time_log_id: effectiveTimeLogId,
        technician_id: input.technicianId,
        target_date: input.targetDate,
        correction_type: correctionType,
        original_time_in: originalTimeIn,
        original_time_out: originalTimeOut,
        corrected_time_in: inDate.toISOString(),
        corrected_time_out: outDate.toISOString(),
        reason: trimmedReason,
        corrected_by: user.id,
        actor_role: profile.role
      })

    if (correctionErr) {
      console.error("[CORRECTION_LOG_INSERT_ERROR]:", correctionErr.message)
      throw correctionErr
    }

    // 5. Auditable Activity Logging
    try {
      await logActivity({
        action: correctionType,
        category: 'dtr_audit_correction',
        description: `${profile.full_name || profile.role.toUpperCase()} (${profile.role}) ${correctionType === 'update_punch' ? 'adjusted' : 'manually inserted'} DTR shift on ${input.targetDate}. Rationale: "${trimmedReason}"`,
        metadata: {
          technicianId: input.technicianId,
          targetDate: input.targetDate,
          timeLogId: effectiveTimeLogId,
          grossHours,
          netHours
        }
      })
    } catch (logErr) {
      console.warn("Failed to log audit activity:", logErr)
    }

    // 6. Path Revalidation
    revalidatePath('/accountant')
    revalidatePath('/hr')
    revalidatePath('/hr/audit')

    return { success: true, timeLogId: effectiveTimeLogId || undefined }
  } catch (err: any) {
    console.error("[CORRECT_PUNCH_EXCEPTION]:", err.message)
    return { success: false, error: err.message || "Failed to execute punch correction." }
  }
}

/**
 * Fetches the complete immutable correction history for a specific technician
 */
export async function getTimeLogCorrectionHistory(
  technicianId: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; records: CorrectionHistoryRecord[]; error?: string }> {
  try {
    await getAuthorizedActor()

    let query = supabaseAdmin
      .from('time_log_corrections')
      .select(`
        id,
        time_log_id,
        technician_id,
        target_date,
        correction_type,
        original_time_in,
        original_time_out,
        corrected_time_in,
        corrected_time_out,
        reason,
        corrected_by,
        actor_role,
        created_at,
        profiles!time_log_corrections_corrected_by_fkey (
          full_name
        )
      `)
      .eq('technician_id', technicianId)
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('target_date', startDate)
    }
    if (endDate) {
      query = query.lte('target_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const mapped: CorrectionHistoryRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      time_log_id: row.time_log_id,
      technician_id: row.technician_id,
      target_date: row.target_date,
      correction_type: row.correction_type,
      original_time_in: row.original_time_in,
      original_time_out: row.original_time_out,
      corrected_time_in: row.corrected_time_in,
      corrected_time_out: row.corrected_time_out,
      reason: row.reason,
      corrected_by: row.corrected_by,
      actor_role: row.actor_role,
      actor_name: row.profiles?.full_name || 'Admin',
      created_at: row.created_at
    }))

    return { success: true, records: mapped }
  } catch (err: any) {
    console.error("[FETCH_CORRECTION_HISTORY_ERROR]:", err.message)
    return { success: false, records: [], error: err.message }
  }
}
