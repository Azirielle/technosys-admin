import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ActivityClient from './ActivityClient'

export const revalidate = 0

export default async function ActivityPage() {
  const supabase = await createClient()

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      user = data.user
    }
  } catch (e) {
    console.error("Auth session expired")
  }

  if (!user) {
    redirect('/login')
  }

  // Fetch activity logs under current user RLS
  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('*, actor:profiles(full_name, role)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error querying activity logs:", error.message)
  }

  return <ActivityClient initialLogs={logs || []} />
}
