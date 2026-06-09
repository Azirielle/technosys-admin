import { getTechnicians } from "@/app/actions/employees"
import { getOfficeLocations } from "@/app/actions/geofence"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EmployeesClient from "./EmployeesClient"

export const revalidate = 0 // Force dynamic execution for real-time counts and lists

export default async function EmployeesPage() {
  const technicians = await getTechnicians()
  const officeLocations = await getOfficeLocations()

  // Fetch active logs for today (clocked in and not yet clocked out)
  const today = new Date().toISOString().split('T')[0]
  const { data: activeLogs } = await supabaseAdmin
    .from('time_logs')
    .select('technician_id')
    .is('app_time_out', null)
    .gte('created_at', `${today}T00:00:00Z`)

  const activeIds = (activeLogs || []).map(log => log.technician_id)

  return (
    <EmployeesClient 
      initialTechnicians={technicians} 
      officeLocations={officeLocations} 
      activeTechnicianIds={activeIds} 
    />
  )
}
