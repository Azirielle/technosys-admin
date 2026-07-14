import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPendingSelfies, getAttendanceHistory } from '@/app/actions/attendance'
import AttendanceTabs from './AttendanceTabs'
import { Clock } from 'lucide-react'
import { verifyRoleAccess } from '@/lib/permissions'

export const revalidate = 0;

export default async function AttendancePage() {
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

  const pendingSelfies = await getPendingSelfies();
  const history = await getAttendanceHistory();
  const { authorized: canApprove } = await verifyRoleAccess('attendance', true)

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-indigo-600" />
            Attendance & Approvals
          </h1>
          <p className="mt-2 text-slate-500 font-medium text-lg">
            Manage daily time records, geofence logs, and approve selfies.
          </p>
        </div>
      </div>

      <AttendanceTabs pendingSelfies={pendingSelfies} history={history} canApprove={canApprove} />
    </div>
  )
}
