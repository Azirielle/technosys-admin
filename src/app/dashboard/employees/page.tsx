import { createClient } from "@/lib/supabase/server"
import { getTechnicians } from "@/app/actions/employees"
import { getOfficeLocations } from "@/app/actions/geofence"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import EmployeesClient from "./EmployeesClient"

export const revalidate = 0 // Force dynamic execution for real-time counts and lists

export default async function EmployeesPage() {
  const supabase = await createClient()
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

  // Fetch approved leaves covering today (in Manila/GMT+8 timezone)
  const todayManila = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())
  const { data: activeLeaves } = await supabaseAdmin
    .from('leaves')
    .select('technician_id')
    .eq('status', 'approved')
    .lte('start_date', todayManila)
    .gte('end_date', todayManila)

  const activeLeaveIds = (activeLeaves || []).map(leave => leave.technician_id)

  // Verify write permission for employees management
  const { authorized: isWriteAllowed } = await verifyRoleAccess('employees', true)

  return (
    <EmployeesClient 
      initialTechnicians={technicians} 
      officeLocations={officeLocations} 
      activeTechnicianIds={activeIds} 
      activeLeaveTechnicianIds={activeLeaveIds}
      isWriteAllowed={isWriteAllowed}
    />
  )
}

