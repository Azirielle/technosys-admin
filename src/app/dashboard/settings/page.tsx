import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getOfficeLocations } from "@/app/actions/geofence"
import { getAdmins } from "@/app/actions/employees"
import { getAnnouncements, getHolidays } from "@/app/actions/announcements"
import { redirect } from "next/navigation"
import { getDocuments } from "@/app/actions/documents"
import SettingsClient from "./SettingsClient"

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

  // Fetch announcements & holidays
  const announcementsList = await getAnnouncements()
  const holidaysList = await getHolidays()

  // Fetch admins list (Super Admins only)
  let adminsList: any[] = []
  if (userRole === 'super_admin') {
    adminsList = await getAdmins()
  }

  // Fetch documents list
  const documentsList = await getDocuments()

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto">
      <SettingsClient
        locations={locations || []}
        sssBrackets={sssBrackets || []}
        announcementsList={announcementsList || []}
        holidaysList={holidaysList || []}
        adminsList={adminsList || []}
        documentsList={documentsList || []}
        userRole={userRole}
      />
    </div>
  )
}
