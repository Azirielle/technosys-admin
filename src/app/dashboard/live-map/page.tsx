import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { verifyRoleAccess } from '@/lib/permissions'
import { getActiveTechniciansLocations } from '@/app/actions/tracking'
import LiveTrackingDashboard from './LiveTrackingDashboard'
import { MapPin } from 'lucide-react'

export const revalidate = 0; // Prevent caching to always get the latest active list

export default async function LiveMapPage() {
  const supabase = await createClient()

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      user = data.user;
    }
  } catch (e) {
    console.error("Auth session expired");
  }

  if (!user) {
    redirect('/login')
  }

  // Use 'overview' or 'attendance' module permission. Only admins/coordinators should track live.
  const { authorized } = await verifyRoleAccess('overview', false)
  if (!authorized) {
    redirect('/dashboard') // Or some unauthorized page
  }

  // Fetch initial state of active technicians
  const activeTechnicians = await getActiveTechniciansLocations();

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
          <MapPin className="w-6 h-6 text-indigo-600" />
          Live Technician Tracking
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor the real-time locations of all clocked-in technicians.
        </p>
      </div>

      {/* Main Dashboard Area */}
      <div className="flex-grow overflow-hidden relative">
        <LiveTrackingDashboard initialTechnicians={activeTechnicians} />
      </div>
    </div>
  )
}
