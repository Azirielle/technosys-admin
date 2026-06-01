import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getOfficeLocations } from "@/app/actions/geofence"
import { getAdmins } from "@/app/actions/employees"
import { redirect } from "next/navigation"
import LocationSettings from "./LocationSettings"
import PhilHealthRuleEditor from "./PhilHealthRuleEditor"
import PagibigRuleEditor from "./PagibigRuleEditor"
import SssDataTable from "./SssDataTable"
import AdminAccounts from "./AdminAccounts"

export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = await createClient()

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      user = data.user
    }
  } catch (e) {
    console.error("Auth session expired or database wiped")
  }

  if (!user) {
    redirect('/login')
  }

  let userRole = 'admin' // default fallback
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile) {
    userRole = profile.role
  }

  // Fetch geofencing locations
  const locations = await getOfficeLocations()

  // Fetch SSS rules
  const { data: sssBrackets } = await supabaseAdmin
    .from('sss_brackets')
    .select('*')
    .order('min_compensation', { ascending: true })

  // Fetch admins list (Super Admins only)
  let adminsList: any[] = []
  if (userRole === 'super_admin') {
    adminsList = await getAdmins()
  }

  return (
    <div className="p-8 pb-20 max-w-5xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Settings</h1>
        <p className="text-zinc-500 mt-1">Manage branch geofencing parameters, statutory payroll rules, and system access.</p>
        {userRole !== 'super_admin' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5">
            ⚠️ Standard Admin Access: Settings modifications are locked. Please contact a Super Administrator to make changes.
          </div>
        )}
      </div>

      {/* Geofence Configuration */}
      <section className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-800 mb-6 flex items-center gap-2">
          📍 Geofence Configuration
        </h2>
        <LocationSettings initialLocations={locations || []} userRole={userRole} />
      </section>

      {/* Compliance Editors */}
      <section className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-8">
        <h2 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
          ⚖️ Statutory Compliance Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PhilHealthRuleEditor userRole={userRole} />
          <PagibigRuleEditor userRole={userRole} />
        </div>
        <div className="pt-4 border-t border-zinc-100">
          <SssDataTable initialData={sssBrackets || []} userRole={userRole} />
        </div>
      </section>

      {/* Admin Accounts Management (Super Admin only) */}
      {userRole === 'super_admin' && (
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-800 mb-6 flex items-center gap-2">
            🛡️ Administrative Access Management
          </h2>
          <AdminAccounts initialAdmins={adminsList} />
        </section>
      )}
    </div>
  )
}
