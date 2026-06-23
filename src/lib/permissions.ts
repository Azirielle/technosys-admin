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
    
    if (!allowedRoles || !allowedRoles.includes(role)) {
      return { authorized: false, role, userId: user.id }
    }

    return { authorized: true, role, userId: user.id }
  } catch (e) {
    console.error("Error verifying role access:", e)
    return { authorized: false }
  }
}
