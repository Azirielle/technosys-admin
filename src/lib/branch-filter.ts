import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function getBranchFilter(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, branch_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.branch_id) return null

    // Global administrative roles see everything
    const globalRoles = ['super_admin', 'ceo', 'coo', 'svp', 'hr', 'accountant']
    if (globalRoles.includes(profile.role)) return null

    // Check if user's branch is the mother branch
    const { data: branch } = await supabaseAdmin
      .from('office_locations')
      .select('name')
      .eq('id', profile.branch_id)
      .single()

    if (branch) {
      const isMotherBranch = branch.name === 'Main Office' || branch.name.toLowerCase().includes('pacita')
      if (isMotherBranch) return null
    }

    // Return the child branch ID to filter by
    return profile.branch_id
  } catch (e) {
    console.error("Error in getBranchFilter:", e)
    return null
  }
}
