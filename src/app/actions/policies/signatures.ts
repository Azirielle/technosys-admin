import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "../activity"
import { sendPushToUser } from "@/lib/push"
import { policyStaff } from "./utils"

// Fetch acknowledgments with joined profile records
export async function getPolicyAcknowledgments(policyId?: string) {
  try {
    // Signers' names, phone numbers and IP addresses: HR and the CEO only.
    if (!(await policyStaff())) return { success: false, error: "Only HR and the CEO can see signatures.", acknowledgments: [] }
    let query = supabaseAdmin
      .from('policy_acknowledgments')
      .select(`
        id,
        user_id,
        policy_id,
        policy_version,
        acknowledged_at,
        ip_address,
        user_agent,
        user:profiles!user_id (
          id,
          full_name,
          role,
          technician_level,
          contact_number
        )
      `)
      .order('acknowledged_at', { ascending: false })

    if (policyId && policyId !== 'all') {
      query = query.eq('policy_id', policyId)
    }

    const { data, error } = await query
    if (error) throw error

    return { success: true, acknowledgments: (data || []) as any[] }
  } catch (err: any) {
    console.error("Failed to fetch policy acknowledgments:", err.message || err)
    return { success: false, error: err.message || "Failed to retrieve acknowledgments", acknowledgments: [] }
  }
}

// 8. Dispatch compliance reminder notice to pending technicians
export async function dispatchPolicyReminder(policyId: string, userIds: string[]) {
  try {
    const user = await policyStaff()
    if (!user) return { success: false, error: "Only HR and the CEO can change policies." }

    const { data: policy } = await supabaseAdmin
      .from('policies')
      .select('title, version')
      .eq('id', policyId)
      .single()

    if (!policy) return { success: false, error: "Policy not found" }

    // Push a reminder to each person who still has to sign
    await Promise.all(userIds.map((uid) => sendPushToUser(
      uid,
      "Policy Signature Required",
      `Please read and acknowledge ${policy.title} (${policy.version}) in the TechnoSys app.`,
      { type: 'policy_acknowledgment', policyId }
    )))

    await logActivity(
      'policy_reminder_dispatch',
      'compliance',
      `Dispatched compliance signature notices to ${userIds.length} personnel for "${policy.title}"`
    )

    return { success: true, count: userIds.length }
  } catch (err: any) {
    console.error("Failed to dispatch reminders:", err.message || err)
    return { success: false, error: err.message || "Failed to dispatch reminders." }
  }
}

// 10. User Acknowledgment Action (Called from Mobile or Web)
export async function acknowledgePolicy(policyId: string, version: string, ipAddress?: string, userAgent?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { error } = await supabaseAdmin
      .from('policy_acknowledgments')
      .upsert({
        user_id: user.id,
        policy_id: policyId,
        policy_version: version,
        acknowledged_at: new Date().toISOString(),
        ip_address: ipAddress || null,
        user_agent: userAgent || null
      }, {
        onConflict: 'user_id,policy_id,policy_version'
      })

    if (error) throw error

    revalidatePath('/hr/policies')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to record policy acknowledgment:", err.message || err)
    return { success: false, error: err.message || "Failed to record acknowledgment." }
  }
}
