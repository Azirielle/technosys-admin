import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import SchedulesClient from "./SchedulesClient"
import { getBranchFilter } from "@/lib/branch-filter"

export const revalidate = 0; // Prevent caching so we see real-time VIP Hooks

export default async function SchedulesPage() {
  const supabase = await createClient()
  const filterBranchId = await getBranchFilter()

  // Fetch both technicians and helpers
  let staffQuery = supabaseAdmin
    .from('profiles')
    .select('*')
    .in('role', ['technician', 'helper'])

  if (filterBranchId) {
    staffQuery = staffQuery.eq('branch_id', filterBranchId)
  }

  const { data: staff } = await staffQuery.order('full_name')

  // Query schedules
  let schedulesQuery = supabaseAdmin
    .from('schedules')
    .select('*, technician:profiles!technician_id(full_name, role, branch_id), senior_partner:profiles!senior_partner_id(full_name, role)')

  if (filterBranchId) {
    const staffIds = (staff || []).map(s => s.id)
    if (staffIds.length > 0) {
      schedulesQuery = schedulesQuery.in('technician_id', staffIds)
    } else {
      schedulesQuery = schedulesQuery.eq('technician_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: schedules } = await schedulesQuery.order('start_time', { ascending: true })

  // Query approved leaves
  let leavesQuery = supabaseAdmin
    .from('leaves')
    .select('*')
    .eq('status', 'approved')

  if (filterBranchId) {
    const staffIds = (staff || []).map(s => s.id)
    if (staffIds.length > 0) {
      leavesQuery = leavesQuery.in('technician_id', staffIds)
    } else {
      leavesQuery = leavesQuery.eq('technician_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: approvedLeaves } = await leavesQuery

  // Verify write permission for schedules
  const { authorized: isWriteAllowed } = await verifyRoleAccess('schedules', true)

  return (
    <SchedulesClient 
      initialStaff={staff || []}
      initialSchedules={schedules || []} 
      approvedLeaves={approvedLeaves || []}
      isWriteAllowed={isWriteAllowed}
    />
  )
}

