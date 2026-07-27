"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface ActivityLog {
  id: string
  category: string
  action: string
  description: string
  performed_by_name: string | null
  created_at: string
}

// Log a system/admin activity, accepting either object arguments or positional arguments
export async function logActivity(
  firstArg: string | { category: string; action: string; description: string; metadata?: any },
  secondArg?: string,
  thirdArg?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn("Could not log activity: No authenticated user found.")
      return { error: 'Not authenticated' }
    }

    let action_type = ''
    let target_category = ''
    let description = ''

    if (typeof firstArg === 'object' && firstArg !== null) {
      action_type = firstArg.action
      target_category = firstArg.category
      description = firstArg.description
    } else if (typeof firstArg === 'string' && secondArg && thirdArg) {
      action_type = firstArg
      target_category = secondArg
      description = thirdArg
    } else {
      console.warn("Invalid arguments provided to logActivity:", firstArg, secondArg, thirdArg)
      return { error: 'Invalid arguments' }
    }

    const { error } = await supabase.from('activity_logs').insert({
      actor_id: user.id,
      action_type: action_type,
      target_category: target_category,
      description: description
    })

    if (error) {
      console.error("Error inserting activity log:", error.message)
      return { error: error.message }
    }

    revalidatePath('/dashboard/activity')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e: any) {
    console.error("logActivity exception:", e)
    return { error: e.message || 'Unknown error logging activity' }
  }
}

// Fetch activity logs, mapping Phase 9 schema back to the frontend ActivityLog interface
export async function getActivityLogs(category?: string, page = 1, pageSize = 10) {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('activity_logs')
      .select('*, actor:profiles(full_name, role)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('target_category', category)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error("Error fetching activity logs:", error.message)
      return { error: error.message, logs: [], count: 0 }
    }

    const logs: ActivityLog[] = (data || []).map((row: any) => ({
      id: row.id,
      category: row.target_category || 'other',
      action: row.action_type || '',
      description: row.description || '',
      performed_by_name: row.actor?.full_name || 'System',
      created_at: row.created_at
    }))

    return { logs, count: count || 0 }
  } catch (e: any) {
    console.error("getActivityLogs exception:", e)
    return { error: e.message || 'Unknown error fetching activity logs', logs: [], count: 0 }
  }
}
