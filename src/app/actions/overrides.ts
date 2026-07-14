"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

export async function getActiveOverrides() {
  const { authorized } = await verifyRoleAccess('settings', false)
  if (!authorized) return { error: "Unauthorized" }

  const { data: overridesData, error } = await supabaseAdmin
    .from('role_overrides')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching overrides:", error)
    return { error: error.message || "Failed to fetch overrides" }
  }

  // Fetch profiles manually to attach names, since the FK points to auth.users, not profiles
  let overrides = []
  if (overridesData && overridesData.length > 0) {
    const userIds = [...new Set(overridesData.flatMap(o => [o.target_user_id, o.granted_by]).filter(Boolean))]
    
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    overrides = overridesData.map(o => ({
      ...o,
      target: profileMap.get(o.target_user_id) || { full_name: 'Unknown User' },
      granter: profileMap.get(o.granted_by) || { full_name: 'Unknown Admin' }
    }))
  }

  return { overrides }
}

export async function grantTemporaryOverride(targetUserId: string, grantedRole: string, durationDays: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { authorized, role } = await verifyRoleAccess('settings', true)
  if (!authorized || (role !== 'ceo' && role !== 'super_admin')) {
    return { error: "Only the CEO or Super Admin can grant overrides." }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + durationDays)

  const { error } = await supabaseAdmin
    .from('role_overrides')
    .insert({
      target_user_id: targetUserId,
      granted_role: grantedRole,
      granted_by: user.id,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error("Error granting override:", error)
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function revokeOverride(overrideId: string) {
  const { authorized, role } = await verifyRoleAccess('settings', true)
  if (!authorized || (role !== 'ceo' && role !== 'super_admin')) {
    return { error: "Only the CEO or Super Admin can revoke overrides." }
  }

  const { error } = await supabaseAdmin
    .from('role_overrides')
    .delete()
    .eq('id', overrideId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
