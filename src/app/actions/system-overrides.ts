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
      .from('system_overrides')
      .select('role_key, granted_modules, override_metadata')

    if (error) {
      console.error("[SYSTEM_OVERRIDES_FETCH_ERROR]:", error.message)
      return {
        success: false,
        overrides: { accountant: [], coordinator: [], hr: [] },
        metadata: { accountant: {}, coordinator: {}, hr: {} },
        error: error.message
      }
    }

    const map: OverrideMap = {
      accountant: [],
      coordinator: [],
      hr: []
    }
    const metaMap: OverrideMetadataMap = {
      accountant: {},
      coordinator: {},
      hr: {}
    }

    if (data) {
      data.forEach((row: any) => {
        if (row.role_key === 'accountant' || row.role_key === 'coordinator' || row.role_key === 'hr') {
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
      overrides: { accountant: [], coordinator: [], hr: [] },
      metadata: { accountant: {}, coordinator: {}, hr: {} },
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
    if (!authorized || (role !== 'ceo' && role !== 'super_admin')) {
      return { success: false, error: "Unauthorized. Strictly CEO or Super Admin can modify system overrides." }
    }

    const { error } = await supabaseAdmin
      .from('system_overrides')
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
      await logActivity({
        action: 'update',
        category: 'system_overrides',
        description: `CEO updated cross-departmental overrides for role [${roleKey.toUpperCase()}]: ${grantedModules.length ? grantedModules.join(', ') : 'None (Defaults)'}`,
        metadata: { roleKey, grantedModules, overrideMetadata }
      })
    } catch (logErr) {
      console.warn("Failed to log override activity:", logErr)
    }

    // Revalidate paths for all affected roles
    revalidatePath('/ceo')
    revalidatePath('/accountant')
    revalidatePath('/coordinator')
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
    if (!authorized || (role !== 'ceo' && role !== 'super_admin')) {
      return { success: false, error: "Unauthorized. Strictly CEO or Super Admin can modify system overrides." }
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

    const roles: RoleKey[] = ['accountant', 'coordinator', 'hr']

    for (const r of roles) {
      const { error } = await supabaseAdmin
        .from('system_overrides')
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
    revalidatePath('/accountant')
    revalidatePath('/coordinator')
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
    if (!authorized || (role !== 'ceo' && role !== 'super_admin')) {
      return { success: false, error: "Unauthorized. Strictly CEO or Super Admin can modify system overrides." }
    }

    const roles: RoleKey[] = ['accountant', 'coordinator', 'hr']

    for (const r of roles) {
      const { error } = await supabaseAdmin
        .from('system_overrides')
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
    revalidatePath('/accountant')
    revalidatePath('/coordinator')
    revalidatePath('/hr')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reset overrides" }
  }
}
