import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "../activity"
import type { CompanyPolicy, PolicyCategory } from "./types"
import { hashContent, policyStaff } from "./utils"

// 1. Create a brand new policy draft
export async function createPolicyDraft(formData: {
  title: string
  category: PolicyCategory
  version?: string
  target_audience: 'all' | 'technician' | 'admin'
  summary: string
  content_markdown: string
  is_mandatory: boolean
  effective_date?: string
}) {
  try {
    const user = await policyStaff()
    if (!user) return { success: false, error: "Only HR and the CEO can change policies." }

    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
    const id = `${slug}_${Date.now().toString(36)}`
    const version = formData.version || 'v1.0.0-draft'
    const content_hash = hashContent(formData.content_markdown)

    const newPolicy = {
      id,
      title: formData.title,
      category: formData.category,
      version,
      effective_date: formData.effective_date || new Date().toISOString().split('T')[0],
      target_audience: formData.target_audience,
      summary: formData.summary,
      content_markdown: formData.content_markdown,
      is_mandatory: formData.is_mandatory,
      is_active: false,
      status: 'draft',
      content_hash,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('policies')
      .insert(newPolicy)
      .select()
      .single()

    if (error) throw error

    await logActivity(
      'policy_create',
      'compliance',
      `Created new policy working draft "${formData.title}" (${version})`
    )

    revalidatePath('/hr/policies')
    return { success: true, policy: data as CompanyPolicy }
  } catch (err: any) {
    console.error("Failed to create policy draft:", err.message || err)
    return { success: false, error: err.message || "Failed to create policy draft." }
  }
}

// 2. Fork an active published policy into a single working draft revision
export async function forkPolicyRevision(policyId: string) {
  try {
    const user = await policyStaff()
    if (!user) return { success: false, error: "Only HR and the CEO can change policies." }

    // Enforce the Single-Draft Invariant: Check if a draft or under_review revision already exists
    const { data: existingDraft } = await supabaseAdmin
      .from('policies')
      .select('*')
      .eq('parent_policy_id', policyId)
      .in('status', ['draft', 'under_review'])
      .maybeSingle()

    if (existingDraft) {
      return {
        success: true,
        policy: existingDraft as CompanyPolicy,
        isExisting: true,
        message: `An active revision (${existingDraft.version}) already exists for this policy.`
      }
    }

    // Fetch original published policy
    const { data: original, error: fetchErr } = await supabaseAdmin
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .single()

    if (fetchErr || !original) {
      return { success: false, error: "Original policy not found." }
    }

    // Generate incremented draft version tag
    const vMatch = original.version.match(/v?(\d+)\.(\d+)(?:\.(\d+))?/)
    let newVersion = 'v1.1.0-draft'
    if (vMatch) {
      const major = parseInt(vMatch[1] || '1', 10)
      const minor = parseInt(vMatch[2] || '0', 10) + 1
      newVersion = `v${major}.${minor}.0-draft`
    }

    const draftId = `${original.id}_rev_${Date.now().toString(36)}`
    const content_hash = hashContent(original.content_markdown)

    const forkedPolicy = {
      id: draftId,
      title: original.title,
      category: original.category,
      version: newVersion,
      effective_date: original.effective_date,
      target_audience: original.target_audience,
      summary: original.summary,
      content_markdown: original.content_markdown,
      is_mandatory: original.is_mandatory,
      is_active: false,
      status: 'draft',
      parent_policy_id: original.id,
      content_hash,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('policies')
      .insert(forkedPolicy)
      .select()
      .single()

    if (insertErr) throw insertErr

    await logActivity(
      'policy_fork',
      'compliance',
      `Forked active policy "${original.title}" into draft revision ${newVersion}`
    )

    revalidatePath('/hr/policies')
    return { success: true, policy: inserted as CompanyPolicy, isExisting: false }
  } catch (err: any) {
    console.error("Failed to fork policy revision:", err.message || err)
    return { success: false, error: err.message || "Failed to fork revision." }
  }
}

// 3. Update working draft content
export async function updatePolicyDraft(formData: {
  id: string
  title: string
  category: PolicyCategory
  version?: string
  target_audience: 'all' | 'technician' | 'admin'
  summary: string
  content_markdown: string
  is_mandatory: boolean
  effective_date?: string
}) {
  try {
    const user = await policyStaff()
    if (!user) return { success: false, error: "Only HR and the CEO can change policies." }

    // Verify policy is actually in draft or under_review
    const { data: existing } = await supabaseAdmin
      .from('policies')
      .select('status, id, is_active')
      .eq('id', formData.id)
      .single()

    if (!existing || existing.status === 'active' || existing.status === 'archived') {
      return {
        success: false,
        error: "Direct mutation of published or archived policies is prohibited. Fork a new draft instead."
      }
    }

    const content_hash = hashContent(formData.content_markdown)

    const { data, error } = await supabaseAdmin
      .from('policies')
      .update({
        title: formData.title,
        category: formData.category,
        version: formData.version || existing.id,
        target_audience: formData.target_audience,
        summary: formData.summary,
        content_markdown: formData.content_markdown,
        is_mandatory: formData.is_mandatory,
        effective_date: formData.effective_date,
        content_hash,
        updated_at: new Date().toISOString()
      })
      .eq('id', formData.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/hr/policies')
    return { success: true, policy: data as CompanyPolicy }
  } catch (err: any) {
    console.error("Failed to update policy draft:", err.message || err)
    return { success: false, error: err.message || "Failed to save draft changes." }
  }
}

// 9. Backward-compatible direct update helper
export async function updateCompanyPolicy(formData: {
  id: string
  title: string
  category: PolicyCategory
  version: string
  target_audience: 'all' | 'technician' | 'admin'
  summary: string
  content_markdown: string
  is_mandatory: boolean
  is_active: boolean
}) {
  return updatePolicyDraft(formData)
}
