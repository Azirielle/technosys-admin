"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function submitEdit(
  tableName: string, 
  recordId: string, 
  oldData: any, 
  newData: any, 
  moduleName: string
) {
  try {
    const { authorized, role, userId } = await verifyRoleAccess(moduleName, true)
    if (!authorized || !userId) return { error: "Unauthorized access" }

    // Update the record
    const { error: updateErr } = await supabaseAdmin
      .from(tableName)
      .update(newData)
      .eq('id', recordId)

    if (updateErr) return { error: updateErr.message }

    // Log the audit trail
    const { error: auditErr } = await supabaseAdmin
      .from('system_audit_logs')
      .insert({
        table_name: tableName,
        record_id: recordId,
        old_values: oldData,
        new_values: newData,
        edited_by: userId,
        user_role: role
      })

    if (auditErr) console.error("Audit log failed:", auditErr.message)

    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function requestDeletion(
  tableName: string, 
  recordId: string, 
  reason: string, 
  moduleName: string
) {
  try {
    const { authorized, userId } = await verifyRoleAccess(moduleName, true)
    if (!authorized || !userId) return { error: "Unauthorized access" }

    const { error } = await supabaseAdmin
      .from('deletion_requests')
      .insert({
        table_name: tableName,
        record_id: recordId,
        requested_by: userId,
        reason: reason,
        status: 'pending'
      })

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function getDeletionRequests() {
  const { authorized, role } = await verifyRoleAccess('settings', false)
  if (!authorized || (role !== 'ceo' && role !== 'super_admin')) {
    return { error: "Unauthorized access" }
  }

  const { data, error } = await supabaseAdmin
    .from('deletion_requests')
    .select(`
      *,
      requester:profiles!deletion_requests_requested_by_fkey(full_name, role)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { requests: data }
}

export async function processDeletionRequest(
  requestId: string, 
  recordId: string,
  tableName: string,
  action: 'archive' | 'hard_delete' | 'reject'
) {
  try {
    const { authorized, role, userId } = await verifyRoleAccess('settings', true)
    if (!authorized || (role !== 'ceo' && role !== 'super_admin') || !userId) {
      return { error: "Unauthorized access" }
    }

    if (action === 'archive') {
      // Soft delete the target record
      const { error: arcErr } = await supabaseAdmin
        .from(tableName)
        .update({ is_archived: true })
        .eq('id', recordId)
      if (arcErr) return { error: arcErr.message }

      // Update request status
      await supabaseAdmin.from('deletion_requests').update({
        status: 'archived',
        resolved_at: new Date().toISOString(),
        resolved_by: userId
      }).eq('id', requestId)
      
    } else if (action === 'hard_delete') {
      // Hard delete the target record
      const { error: delErr } = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq('id', recordId)
      if (delErr) return { error: delErr.message }

      // Update request status
      await supabaseAdmin.from('deletion_requests').update({
        status: 'deleted',
        resolved_at: new Date().toISOString(),
        resolved_by: userId
      }).eq('id', requestId)
      
    } else if (action === 'reject') {
      // Just reject the request
      await supabaseAdmin.from('deletion_requests').update({
        status: 'rejected',
        resolved_at: new Date().toISOString(),
        resolved_by: userId
      }).eq('id', requestId)
    }

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
