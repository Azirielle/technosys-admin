import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "../activity"
import { addPolicyToLibrary, removePolicyFromLibrary } from "@/lib/policyLibrary"
import type { CompanyPolicy } from "./types"
import { policyStaff } from "./utils"

// 4. Submit working draft for formal review
export async function submitPolicyForReview(policyId: string, customReviewNotes?: string) {
  try {
    const user = await policyStaff()
    if (!user) return { success: false, error: "Only HR and the CEO can change policies." }

    const defaultNotes = 'Awaiting formal review and sign-off by Lead HR Officer or CEO.'
    const notesToSet = customReviewNotes || defaultNotes

    const { data, error } = await supabaseAdmin
      .from('policies')
      .update({
        status: 'under_review',
        review_notes: notesToSet,
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single()

    if (error) throw error

    await logActivity(
      'policy_review_request',
      'compliance',
      `Submitted policy "${data.title}" (${data.version}) for review: ${notesToSet}`
    )

    revalidatePath('/hr/policies')
    return { success: true, policy: data as CompanyPolicy }
  } catch (err: any) {
    console.error("Failed to submit policy for review:", err.message || err)
    return { success: false, error: err.message || "Failed to submit for review." }
  }
}

// 5. Request revisions / reject policy back to draft
export async function requestPolicyChanges(policyId: string, reviewNotes: string) {
  try {
    const user = await policyStaff()
    if (!user) return { success: false, error: "Only HR and the CEO can change policies." }

    const { data, error } = await supabaseAdmin
      .from('policies')
      .update({
        status: 'draft',
        review_notes: reviewNotes || 'Revision requested by reviewer.',
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single()

    if (error) throw error

    await logActivity(
      'policy_revision_requested',
      'compliance',
      `Requested revisions on policy "${data.title}": ${reviewNotes}`
    )

    revalidatePath('/hr/policies')
    return { success: true, policy: data as CompanyPolicy }
  } catch (err: any) {
    console.error("Failed to request changes:", err.message || err)
    return { success: false, error: err.message || "Failed to return policy to draft." }
  }
}

// 6. Approve & Publish Policy (Enforces Four-Eyes Principle and Version Supersedure)
export async function publishPolicy(
  policyId: string,
  options: {
    isMaterialChange?: boolean
    effectiveDate?: string
    emergencyImmediate?: boolean
  } = {}
) {
  try {
    const user = await policyStaff()
    if (!user) return { success: false, error: "Only HR and the CEO can change policies." }

    // Fetch user profile to verify role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin', 'ceo', 'hr'].includes(profile.role)) {
      return { success: false, error: "Permission Denied: Only HR and Executive staff can publish policies." }
    }

    // Fetch candidate policy
    const { data: candidate, error: candErr } = await supabaseAdmin
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .single()

    if (candErr || !candidate) {
      return { success: false, error: "Policy not found." }
    }

    // Four-Eyes Principle: Author cannot self-approve unless user is CEO or Super Admin
    if (
      candidate.created_by &&
      candidate.created_by === user.id &&
      !['ceo', 'super_admin'].includes(profile.role)
    ) {
      return {
        success: false,
        error: "Four-Eyes Principle: An author cannot approve their own policy draft. Another authorized HR officer or the CEO must review and publish."
      }
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const effectiveDate = options.emergencyImmediate
      ? todayStr
      : options.effectiveDate || candidate.effective_date || todayStr

    // Clean version tag: remove "-draft" suffix
    const cleanVersion = candidate.version.replace(/-draft$/, '')

    // Step A: If this policy replaces an existing published parent policy, archive the parent
    if (candidate.parent_policy_id) {
      await supabaseAdmin
        .from('policies')
        .update({
          status: 'archived',
          is_active: false,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidate.parent_policy_id)
    }

    // Step B: Publish the candidate policy
    const { data: published, error: pubErr } = await supabaseAdmin
      .from('policies')
      .update({
        status: 'active',
        is_active: true,
        version: cleanVersion,
        effective_date: effectiveDate,
        published_at: new Date().toISOString(),
        reviewed_by: user.id,
        review_notes: `Approved & Published by ${profile.full_name} (${profile.role.toUpperCase()})`,
        is_material_change: Boolean(options.isMaterialChange),
        updated_at: new Date().toISOString(),
      })
      .eq('id', policyId)
      .select()
      .single()

    if (pubErr) throw pubErr

    // The AI assistant answers from this version from now on. A failure doesn't undo the publish; it's noted in the log.
    let aiNote = ''
    try { await addPolicyToLibrary(supabaseAdmin, published) } catch (e) {
      console.error("AI library update failed:", (e as Error).message)
      aiNote = ' The AI assistant could not learn this version: run scripts/sync-policies-rag.ts.'
    }

    // Step C: If material change, dispatch notification alerts to workforce
    if (options.isMaterialChange) {
      await logActivity(
        'policy_publish_material',
        'compliance',
        `Published Material Policy Update "${published.title}" (${cleanVersion}). Mandatory workforce re-signature required.${aiNote}`
      )
    } else {
      await logActivity(
        'policy_publish',
        'compliance',
        `Published Policy "${published.title}" (${cleanVersion}).${aiNote}`
      )
    }

    revalidatePath('/hr/policies')
    revalidatePath('/terms')
    revalidatePath('/privacy')

    return { success: true, policy: published as CompanyPolicy }
  } catch (err: any) {
    console.error("Failed to publish policy:", err.message || err)
    return { success: false, error: err.message || "Failed to publish policy." }
  }
}

// 7. Archive an active policy
export async function archivePolicy(policyId: string) {
  try {
    const user = await policyStaff()
    if (!user) return { success: false, error: "Only HR and the CEO can change policies." }

    const { data, error } = await supabaseAdmin
      .from('policies')
      .update({
        status: 'archived',
        is_active: false,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single()

    if (error) throw error

    // The AI assistant stops answering from an archived policy.
    let aiNote = ''
    try { await removePolicyFromLibrary(supabaseAdmin, data.id) } catch (e) {
      console.error("AI library update failed:", (e as Error).message)
      aiNote = ' The AI assistant could still quote it: run scripts/sync-policies-rag.ts.'
    }

    await logActivity(
      'policy_archive',
      'compliance',
      `Archived policy document "${data.title}" (${data.version})${aiNote}`
    )

    revalidatePath('/hr/policies')
    return { success: true, policy: data as CompanyPolicy }
  } catch (err: any) {
    console.error("Failed to archive policy:", err.message || err)
    return { success: false, error: err.message || "Failed to archive policy." }
  }
}
