'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logActivity(actionType: string, targetCategory: string, description: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn("Could not log activity: No authenticated user found.")
      return { error: 'Not authenticated' }
    }

    const { error } = await supabase.from('activity_logs').insert({
      actor_id: user.id,
      action_type: actionType,
      target_category: targetCategory,
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

export async function getActivityLogs(category?: string) {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('activity_logs')
      .select('*, actor:profiles(full_name, role)')
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('target_category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching activity logs:", error.message)
      return { error: error.message, logs: [] }
    }

    return { logs: data || [] }
  } catch (e: any) {
    console.error("getActivityLogs exception:", e)
    return { error: e.message || 'Unknown error fetching activity logs', logs: [] }
  }
}
