import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getActiveOverrides } from "@/app/actions/overrides"
import CeoOverridesClient from "./CeoOverridesClient"
import { redirect } from "next/navigation"

export const revalidate = 0;

export default async function CeoOverridesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Check user role
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['ceo', 'super_admin', 'coo'].includes(profile.role)) {
    redirect("/dashboard")
  }

  // Fetch admin profiles for delegation dropdown
  const { data: admins } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name', { ascending: true })

  // Fetch active overrides
  const overridesRes = await getActiveOverrides()
  const activeOverrides = overridesRes.overrides || []

  // Fetch pending deletion requests
  const { data: deletionRequests } = await supabaseAdmin
    .from('deletion_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <CeoOverridesClient
        adminsList={admins || []}
        activeOverrides={activeOverrides}
        deletionRequests={deletionRequests || []}
      />
    </div>
  )
}
