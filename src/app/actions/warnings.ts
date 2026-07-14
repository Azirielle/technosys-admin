"use server"

import { createClient } from "@/lib/supabase/server"
import { verifyRoleAccess } from "@/lib/permissions"

export async function getWarnings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employee_warnings')
    .select(`
      *,
      employee:employee_id(full_name, role),
      issuer:issued_by(full_name, role),
      reviewer:service_dept_reviewer_id(full_name, role),
      editor:last_edited_by(full_name, role)
    `)
    .order('created_at', { ascending: false })
  
  if (error) return { error: error.message }
  return { data }
}

export async function getEmployeesForWarnings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name', { ascending: true })
  
  if (error) return { error: error.message }
  return { data }
}

export async function createWarning(formData: FormData) {
  try {
    const { authorized, userId } = await verifyRoleAccess('warnings', true)
    if (!authorized || !userId) return { error: "Unauthorized." }

    const employee_id = formData.get("employee_id") as string
    const warning_level = formData.get("warning_level") as string
    const incident_date = formData.get("incident_date") as string
    const policies_violated = formData.get("policies_violated") as string
    const subject = formData.get("subject") as string
    const details = formData.get("details") as string
    
    if (!employee_id || !warning_level || !subject || !details) {
      return { error: "Missing required fields." }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('employee_warnings').insert({
      employee_id,
      issued_by: userId,
      warning_level,
      incident_date: incident_date || null,
      policies_violated,
      subject,
      details,
      status: 'pending_service_review'
    })

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateWarning(formData: FormData) {
  try {
    const { authorized, userId } = await verifyRoleAccess('warnings', true)
    if (!authorized || !userId) return { error: "Unauthorized." }

    const id = formData.get("id") as string
    const warning_level = formData.get("warning_level") as string
    const incident_date = formData.get("incident_date") as string
    const policies_violated = formData.get("policies_violated") as string
    const subject = formData.get("subject") as string
    const details = formData.get("details") as string

    if (!id || !warning_level || !subject || !details) return { error: "Missing required fields." }

    const supabase = await createClient()
    const { error } = await supabase.from('employee_warnings').update({
      warning_level,
      incident_date: incident_date || null,
      policies_violated,
      subject,
      details,
      last_edited_by: userId,
      updated_at: new Date().toISOString()
    }).eq("id", id)

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function forwardWarning(id: string) {
  try {
    const { authorized, userId } = await verifyRoleAccess('warnings', true)
    if (!authorized || !userId) return { error: "Unauthorized." }

    const supabase = await createClient()
    const { error } = await supabase.from('employee_warnings').update({
      status: 'issued_to_technician',
      service_dept_reviewer_id: userId,
      updated_at: new Date().toISOString()
    }).eq("id", id)

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function rejectWarning(formData: FormData) {
  try {
    const { authorized, userId } = await verifyRoleAccess('warnings', true)
    if (!authorized || !userId) return { error: "Unauthorized." }

    const id = formData.get("id") as string
    const reason = formData.get("reason") as string

    if (!id || !reason) return { error: "ID and Rejection Reason are required." }

    const supabase = await createClient()
    const { error } = await supabase.from('employee_warnings').update({
      status: 'rejected',
      rejection_reason: reason,
      service_dept_reviewer_id: userId,
      updated_at: new Date().toISOString()
    }).eq("id", id)

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteWarning(id: string) {
  try {
    const { authorized } = await verifyRoleAccess('warnings', true)
    // Extra check to only let super admins or HR delete maybe? Or just relying on the role.
    if (!authorized) return { error: "Unauthorized." }

    const supabase = await createClient()
    const { error } = await supabase.from('employee_warnings').delete().eq("id", id)

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
