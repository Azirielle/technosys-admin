import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { MODULE_ROLES, WRITE_ROLES, type UserRole } from "./permissions-client"

export * from "./permissions-client"

// Server-side check helper for actions and page loads
export async function verifyRoleAccess(moduleName: string, requiresWrite: boolean = false): Promise<{ authorized: boolean; role?: UserRole; userId?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { authorized: false }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.role) return { authorized: false }

    const role = profile.role as UserRole
    const allowedRoles = requiresWrite ? WRITE_ROLES[moduleName] : MODULE_ROLES[moduleName]

    // 1. Check if their base role is allowed
    let isAuthorized = false
    let authorizedRole = role

    if (allowedRoles && allowedRoles.includes(role)) {
      isAuthorized = true
    }

    // 2. Check overrides if base role isn't enough
    if (!isAuthorized && allowedRoles) {
      const { data: overrides } = await supabaseAdmin
        .from('role_overrides')
        .select('granted_role')
        .eq('target_user_id', user.id)
        .gt('expires_at', new Date().toISOString())

      if (overrides) {
        for (const override of overrides) {
          if (allowedRoles.includes(override.granted_role as UserRole)) {
            isAuthorized = true
            authorizedRole = override.granted_role as UserRole
            break
          }
        }
      }
    }

    if (!isAuthorized) {
      return { authorized: false, role: authorizedRole, userId: user.id }
    }

    return { authorized: true, role: authorizedRole, userId: user.id }
  } catch (e) {
    console.error("Error verifying role access:", e)
    return { authorized: false }
  }
}
