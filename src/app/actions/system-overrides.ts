"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"
import { RoleKey, OverrideMap, OverrideMetadataMap, OverrideMetadataItem, isOverrideActive, SYSTEM_MODULES } from "@/lib/overrides"

/**
 * Fetches current system-wide persistent module overrides from Supabase
 */
export async function getPersistentOverrides(): Promise<{ 
  success: boolean; 
  overrides: OverrideMap; 
  metadata: OverrideMetadataMap; 
  error?: string 
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('role_access')
      .select('role_key, granted_modules, override_metadata')

    if (error) {
      console.error("[SYSTEM_OVERRIDES_FETCH_ERROR]:", error.message)
      return {
        success: false,
        overrides: { coordinator: [], hr: [] },
        metadata: { coordinator: {}, hr: {} },
        error: error.message
      }
    }

    const map: OverrideMap = {
      coordinator: [],
      hr: []
    }
    const metaMap: OverrideMetadataMap = {
      coordinator: {},
      hr: {}
    }

    if (data) {
      data.forEach((row: any) => {
        if (row.role_key === 'coordinator' || row.role_key === 'hr') {
          const role = row.role_key as RoleKey
          const rawModules = Array.isArray(row.granted_modules) ? row.granted_modules : []
          const meta = row.override_metadata || {}
          metaMap[role] = meta

          map[role] = rawModules.filter((modId: string) => {
            const item = meta[modId]
            return isOverrideActive(item)
          })
        }
      })
    }

    return { success: true, overrides: map, metadata: metaMap }
  } catch (err: any) {
    console.error("[SYSTEM_OVERRIDES_EXCEPTION]:", err.message)
    return {
      success: false,
      overrides: { coordinator: [], hr: [] },
      metadata: { coordinator: {}, hr: {} },
      error: err.message
    }
  }
}

/**
 * Persists an update to a specific role's granted modules with duration metadata
 */
export async function updatePersistentOverride(
  roleKey: RoleKey,
  grantedModules: string[],
  overrideMetadata?: Record<string, OverrideMetadataItem>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { authorized, role } = await verifyRoleAccess('settings', true)
    if (!authorized || role !== 'ceo') {
      return { success: false, error: "Unauthorized. Only the CEO can modify system overrides." }
    }

    const { error } = await supabaseAdmin
      .from('role_access')
      .upsert({
        role_key: roleKey,
        granted_modules: grantedModules,
        override_metadata: overrideMetadata || {},
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'role_key' })

    if (error) throw error

    // Record auditable change in activity_logs
    try {
      const roleDisplay: Record<string, string> = {
        coordinator: 'Field Operations',
        hr: 'HR Department',
        ceo: 'CEO'
      }
      const roleLabel = roleDisplay[roleKey] || roleKey
      const friendlyModules = grantedModules.map(m => {
        const found = SYSTEM_MODULES.find(mod => mod.id === m)
        return found ? found.name : m
      })
      let reasonSuffix = ''
      if (overrideMetadata) {
        const firstMod = Object.values(overrideMetadata)[0]
        if (firstMod?.granted_by_name && firstMod.granted_by_name.includes('(')) {
          const match = firstMod.granted_by_name.match(/\((.*?)\)/)
          if (match && match[1] && match[1] !== 'Temporary Department Coverage') {
            reasonSuffix = ` · Reason: ${match[1]}`
          }
        }
      }

      const desc = grantedModules.length === 0
        ? `CEO restored standard role boundaries for ${roleLabel} (Revoked all active overrides)`
        : `CEO granted temporary override access to ${friendlyModules.join(', ')} for ${roleLabel}${reasonSuffix}`

      await logActivity({
        action: 'update',
        category: 'system_overrides',
        description: desc,
        metadata: { roleKey, grantedModules, overrideMetadata }
      })
    } catch (logErr) {
      console.warn("Failed to log override activity:", logErr)
    }

    // Revalidate paths for all affected roles
    revalidatePath('/ceo')
    revalidatePath('/ceo/activities')
    revalidatePath('/coordinator', 'layout')
    revalidatePath('/hr')

    return { success: true }
  } catch (err: any) {
    console.error("[SYSTEM_OVERRIDES_UPDATE_ERROR]:", err.message)
    return { success: false, error: err.message || "Failed to update override" }
  }
}

/**
 * Grants all cross-departmental modules to all roles
 */
export async function grantAllPersistentOverrides(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { authorized, role } = await verifyRoleAccess('settings', true)
    if (!authorized || role !== 'ceo') {
      return { success: false, error: "Unauthorized. Only the CEO can modify system overrides." }
    }

    const allModuleIds = SYSTEM_MODULES.map(m => m.id)
    const defaultMeta: Record<string, OverrideMetadataItem> = {}
    allModuleIds.forEach(id => {
      defaultMeta[id] = {
        duration: 'indefinite',
        expires_at: null,
        granted_at: new Date().toISOString(),
        granted_by_name: 'CEO Administrator'
      }
    })

    const roles: RoleKey[] = ['coordinator', 'hr']

    for (const r of roles) {
      const { error } = await supabaseAdmin
        .from('role_access')
        .upsert({
          role_key: r,
          granted_modules: allModuleIds,
          override_metadata: defaultMeta,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'role_key' })

      if (error) throw error
    }

    try {
      await logActivity({
        action: 'grant_all',
        category: 'system_overrides',
        description: 'CEO granted all cross-departmental system module overrides to all roles.',
      })
    } catch (logErr) {
      console.warn("Failed to log activity:", logErr)
    }

    revalidatePath('/ceo')
    revalidatePath('/ceo/activities')
    revalidatePath('/coordinator', 'layout')
    revalidatePath('/hr')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to grant all overrides" }
  }
}

/**
 * Resets all cross-departmental module overrides back to empty default role boundaries
 */
export async function resetAllPersistentOverrides(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { authorized, role } = await verifyRoleAccess('settings', true)
    if (!authorized || role !== 'ceo') {
      return { success: false, error: "Unauthorized. Only the CEO can modify system overrides." }
    }

    const roles: RoleKey[] = ['coordinator', 'hr']

    for (const r of roles) {
      const { error } = await supabaseAdmin
        .from('role_access')
        .upsert({
          role_key: r,
          granted_modules: [],
          override_metadata: {},
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'role_key' })

      if (error) throw error
    }

    try {
      await logActivity({
        action: 'reset',
        category: 'system_overrides',
        description: 'CEO reset all cross-departmental module overrides back to default role boundaries.',
      })
    } catch (logErr) {
      console.warn("Failed to log activity:", logErr)
    }

    revalidatePath('/ceo')
    revalidatePath('/ceo/activities')
    revalidatePath('/coordinator', 'layout')
    revalidatePath('/hr')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reset overrides" }
  }
}


export interface StaffAbsence {
  id: string
  name: string
  role: string
  leaveType: string
  startDate: string
  endDate: string
}

/**
 * Fetches staff members with approved leave covering the current date
 */
export async function getStaffAbsencesToday(): Promise<{
  success: boolean
  absences: StaffAbsence[]
  error?: string
}> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabaseAdmin
      .from('leaves')
      .select('id, user_id, leave_type, start_date, end_date, status, profiles(full_name, role)')
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)

    if (error) {
      return { success: true, absences: [] }
    }

    const absences: StaffAbsence[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.profiles?.full_name || 'Staff Member',
      role: row.profiles?.role || 'Staff',
      leaveType: row.leave_type || 'Approved Leave',
      startDate: row.start_date,
      endDate: row.end_date,
    }))

    return { success: true, absences }
  } catch (err: any) {
    return { success: true, absences: [] }
  }
}
