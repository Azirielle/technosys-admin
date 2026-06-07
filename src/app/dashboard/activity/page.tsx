import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActivityLogs } from '@/app/actions/activity'
import ActivityWorkspace from './ActivityWorkspace'

export const revalidate = 0;

export default async function ActivityLogPage() {
  const supabase = await createClient()

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      user = data.user;
    }
  } catch (e) {
    console.error("Auth session expired or database wiped");
  }

  if (!user) {
    redirect('/login')
  }

  // Fetch initial activity logs
  const initialLogs = await getActivityLogs()

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Activity Logs</h1>
          <p className="text-slate-500 font-medium">Real-time system actions and audit trail logs</p>
        </div>
        
        <ActivityWorkspace initialLogs={initialLogs} />
      </div>
    </div>
  )
}
