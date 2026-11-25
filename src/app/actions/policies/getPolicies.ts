import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { CompanyPolicy, PolicyLifecycleStatus } from "./types"

// Fetch public policy for unauthenticated /login & gateway portal.
// A new version gets the id "<original id>_rev_<…>" and the original is archived, so look for the
// active policy with the original id or any of its revisions, newest first.
export async function getPublicPolicy(policyId: 'terms_of_service' | 'privacy_policy' | 'executive_governance') {
  try {
    const { data, error } = await supabaseAdmin
      .from('policies')
      .select('*')
      .or(`id.eq.${policyId},id.like.${policyId}_rev_*`)
      .eq('is_active', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('No active version of this policy.')
    return { success: true, policy: data as CompanyPolicy }
  } catch (err: any) {
    console.error(`Failed to fetch public policy ${policyId}:`, err.message || err)
    return { success: false, error: err.message || "Failed to load policy document." }
  }
}

// Fetch all policies for authenticated / admin users
export async function getAllPolicies() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .order('is_mandatory', { ascending: false })
      .order('title', { ascending: true })

    if (error) throw error

    // Custom sorting: under_review first, then draft, then active, then archived
    const statusWeight: Record<PolicyLifecycleStatus, number> = {
      under_review: 1,
      draft: 2,
      active: 3,
      archived: 4,
    }

    const sorted = [...(data || [])].sort((a: any, b: any) => {
      const weightA = statusWeight[a.status as PolicyLifecycleStatus] || 99
      const weightB = statusWeight[b.status as PolicyLifecycleStatus] || 99
      if (weightA !== weightB) return weightA - weightB
      return a.title.localeCompare(b.title)
    })

    return { success: true, policies: sorted as CompanyPolicy[] }
  } catch (err: any) {
    console.error("Failed to fetch company policies:", err.message || err)
    return { success: false, error: err.message || "Failed to retrieve policies", policies: [] }
  }
}
