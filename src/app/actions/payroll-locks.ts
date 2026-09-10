"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"

export interface PayrollLockInfo {
  id: string
  period_id: string
  start_date: string
  end_date: string
  is_locked: boolean
  locked_at: string
  locked_by: string | null
  locker_name?: string
  lock_notes?: string
  unlocked_at?: string
  unlocked_by?: string
  unlock_reason?: string
}

/**
 * Validates authenticated user role for payroll lock operations
 */
async function getAuthorizedActor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized. Please sign in to manage payroll cutoff locks.")

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error("Unable to resolve authenticated user profile.")
  }

  return { user, profile }
}

/**
 * Checks whether a specific date falls within any active locked Kinsenas cutoff period
 */
export async function isDateInLockedPeriod(dateStr: string): Promise<{ isLocked: boolean; lockInfo?: PayrollLockInfo }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('payroll_cutoff_locks')
      .select(`
        id,
        period_id,
        start_date,
        end_date,
        is_locked,
        locked_at,
        locked_by,
        lock_notes,
        unlocked_at,
        unlocked_by,
        unlock_reason
      `)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .eq('is_locked', true)
      .maybeSingle()

    if (error || !data) {
      return { isLocked: false }
    }

    return {
      isLocked: true,
      lockInfo: data as PayrollLockInfo
    }
  } catch (err) {
    console.error("[CHECK_DATE_LOCK_ERROR]:", err)
    return { isLocked: false }
  }
}

/**
 * Fetches the current cutoff lock status for a given Kinsenas period range
 */
export async function getPeriodLockStatus(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; lockInfo: PayrollLockInfo | null; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('payroll_cutoff_locks')
      .select(`
        id,
        period_id,
        start_date,
        end_date,
        is_locked,
        locked_at,
        locked_by,
        lock_notes,
        unlocked_at,
        unlocked_by,
        unlock_reason,
        profiles!payroll_cutoff_locks_locked_by_fkey (
          full_name
        )
      `)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return { success: true, lockInfo: null }
    }

    const info: PayrollLockInfo = {
      id: data.id,
      period_id: data.period_id,
      start_date: data.start_date,
      end_date: data.end_date,
      is_locked: data.is_locked,
      locked_at: data.locked_at,
      locked_by: data.locked_by,
      locker_name: (data.profiles as any)?.full_name || 'System Admin',
      lock_notes: data.lock_notes,
      unlocked_at: data.unlocked_at,
      unlocked_by: data.unlocked_by,
      unlock_reason: data.unlock_reason
    }

    return { success: true, lockInfo: info }
  } catch (err: any) {
    console.error("[GET_PERIOD_LOCK_ERROR]:", err.message)
    return { success: false, lockInfo: null, error: err.message }
  }
}

/**
 * Finalizes and freezes a Kinsenas pay period, blocking all attendance edits
 */
export async function lockPayrollPeriod(
  periodId: string,
  startDate: string,
  endDate: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await getAuthorizedActor()

    const allowedRoles = ['accountant', 'ceo', 'super_admin']
    if (!allowedRoles.includes(profile.role)) {
      return { success: false, error: "Unauthorized. Strictly Accountant or CEO can finalize and lock payroll periods." }
    }

    const { error } = await supabaseAdmin
      .from('payroll_cutoff_locks')
      .upsert({
        period_id: periodId,
        start_date: startDate,
        end_date: endDate,
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: user.id,
        lock_notes: notes || `Cutoff finalized by ${profile.full_name || profile.role.toUpperCase()} for Kinsenas payroll.`,
        unlocked_at: null,
        unlocked_by: null,
        unlock_reason: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'period_id' })

    if (error) throw error

    // Log Activity
    try {
      await logActivity({
        action: 'lock_payroll_period',
        category: 'payroll_governance',
        description: `${profile.full_name || profile.role.toUpperCase()} finalized and locked Kinsenas period [${startDate} to ${endDate}]. Attendance modifications are now frozen.`,
        metadata: { periodId, startDate, endDate, notes }
      })
    } catch (logErr) {
      console.warn("Failed to log activity:", logErr)
    }

    revalidatePath('/accountant')
    revalidatePath('/hr/audit')

    return { success: true }
  } catch (err: any) {
    console.error("[LOCK_PAYROLL_PERIOD_ERROR]:", err.message)
    return { success: false, error: err.message || "Failed to lock payroll period." }
  }
}

/**
 * Unlocks a frozen Kinsenas pay period. Strictly restricted to CEO or Super Admin.
 */
export async function unlockPayrollPeriod(
  periodId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await getAuthorizedActor()

    if (profile.role !== 'ceo' && profile.role !== 'super_admin') {
      return {
        success: false,
        error: "Forbidden. Only the Chief Executive Officer or Super Admin can unlock a finalized payroll period."
      }
    }

    const trimmedReason = (reason || '').trim()
    if (trimmedReason.length < 10) {
      return {
        success: false,
        error: "Mandatory CEO override reason required (at least 10 characters detailing why this frozen period must be reopened)."
      }
    }

    const { error } = await supabaseAdmin
      .from('payroll_cutoff_locks')
      .update({
        is_locked: false,
        unlocked_at: new Date().toISOString(),
        unlocked_by: user.id,
        unlock_reason: trimmedReason,
        updated_at: new Date().toISOString()
      })
      .eq('period_id', periodId)

    if (error) throw error

    try {
      await logActivity({
        action: 'unlock_payroll_period',
        category: 'payroll_governance',
        description: `CEO ${profile.full_name || ''} issued an administrative override unlocking finalized Kinsenas period [${periodId}]. Rationale: "${trimmedReason}"`,
        metadata: { periodId, reason: trimmedReason }
      })
    } catch (logErr) {
      console.warn("Failed to log activity:", logErr)
    }

    revalidatePath('/accountant')
    revalidatePath('/hr/audit')

    return { success: true }
  } catch (err: any) {
    console.error("[UNLOCK_PAYROLL_PERIOD_ERROR]:", err.message)
    return { success: false, error: err.message || "Failed to unlock payroll period." }
  }
}
