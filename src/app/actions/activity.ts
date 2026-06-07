"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface ActivityLog {
  id: string
  category: 'employees' | 'schedules' | 'leaves' | 'tickets' | 'payroll' | 'inventory' | 'compliance' | 'other'
  action: string
  description: string
  performed_by: string | null
  performed_by_name: string | null
  metadata?: any
  created_at: string
}

// Log a system/admin activity (wrapped in a try-catch to be non-blocking)
export async function logActivity(params: {
  category: ActivityLog['category']
  action: string
  description: string
  metadata?: any
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let performed_by = null
    let performed_by_name = "System"

    if (user) {
      performed_by = user.id
      performed_by_name = user.email || "User"

      // Try to fetch performer name from profiles
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profile?.full_name) {
        performed_by_name = profile.full_name
      }
    }

    const { error } = await supabaseAdmin.from('activity_logs').insert({
      category: params.category,
      action: params.action,
      description: params.description,
      performed_by,
      performed_by_name,
      metadata: params.metadata || null
    })

    if (error) {
      console.error("Supabase insert error for activity_logs:", error)
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/activity")
  } catch (err) {
    // Graceful degradation: never block core system functions if logging fails
    console.error("Failed to log activity:", err)
  }
}

// Fetch activity logs with filters (limited to last 100 entries for performance)
export async function getActivityLogs(filters?: {
  category?: string
  search?: string
}): Promise<ActivityLog[]> {
  try {
    let query = supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,performed_by_name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []) as ActivityLog[]
  } catch (err) {
    console.error("Failed to fetch activity logs:", err)
    return []
  }
}
