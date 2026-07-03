"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/app/actions/activity"

// ------------------------------------------------------------
// Announcements Server Actions
// ------------------------------------------------------------

export async function getAnnouncements() {
  try {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*, branch:office_locations(name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch announcements:", err.message)
    return []
  }
}

export async function createAnnouncement(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || ['technician', 'helper'].includes(profile.role)) {
      return { error: "Security Restriction: Only administrators or coordinators can broadcast announcements." }
    }

    const title = formData.get("title") as string
    const content = formData.get("content") as string
    const branchIdStr = formData.get("targetBranchId") as string
    const targetBranchId = branchIdStr && branchIdStr !== "" ? branchIdStr : null

    if (!title || !content) {
      return { error: "Title and content are required." }
    }

    const { error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content,
        target_branch_id: targetBranchId,
        created_by: user.id
      })

    if (error) throw error

    // Log the announcement creation activity
    try {
      await logActivity({
        action: 'create',
        category: 'announcement',
        description: `Published a new company announcement: "${title}"`
      })
    } catch (logErr: any) {
      console.warn("Failed to log announcement activity:", logErr.message || logErr)
    }

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create announcement:", err.message)
    return { error: err.message || "Failed to publish announcement" }
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to delete announcement:", err.message)
    return { error: err.message || "Failed to delete announcement" }
  }
}

// ------------------------------------------------------------
// Holidays Server Actions
// ------------------------------------------------------------

export async function getHolidays() {
  try {
    const { data, error } = await supabaseAdmin
      .from('holidays')
      .select('*')
      .order('holiday_date', { ascending: true })
    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch holidays:", err.message)
    return []
  }
}

export async function createHoliday(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { error: "Security Restriction: Only administrators can create holidays." }
    }

    const name = formData.get("name") as string
    const holidayDate = formData.get("holidayDate") as string
    const multiplier = Number(formData.get("multiplier") || 1.30)

    if (!name || !holidayDate) {
      return { error: "Name and date are required." }
    }

    const { error } = await supabaseAdmin
      .from('holidays')
      .insert({
        name,
        holiday_date: holidayDate,
        multiplier
      })

    if (error) throw error

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard/payroll')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create holiday:", err.message)
    return { error: err.message || "Failed to save holiday" }
  }
}

export async function deleteHoliday(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { error: "Security Restriction: Only administrators can delete holidays." }
    }

    const { error } = await supabaseAdmin
      .from('holidays')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard/payroll')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to delete holiday:", err.message)
    return { error: err.message || "Failed to delete holiday" }
  }
}
