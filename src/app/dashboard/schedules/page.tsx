import { supabaseAdmin } from "@/lib/supabase/admin"
import SchedulesClient from "./SchedulesClient"

export const revalidate = 0; // Prevent caching so we see real-time VIP Hooks

export default async function SchedulesPage() {
  // Fetch both technicians and helpers
  const { data: staff } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .in('role', ['technician', 'helper'])
    .order('full_name')

  const { data: schedules } = await supabaseAdmin
    .from('schedules')
    .select('*, technician:profiles!technician_id(full_name, role), senior_partner:profiles!senior_partner_id(full_name, role)')
    .order('start_time', { ascending: true })

  const { data: approvedLeaves } = await supabaseAdmin
    .from('leaves')
    .select('*')
    .eq('status', 'approved')

  const technicians = (staff || []).filter(s => s.role === 'technician')
  const helpers = (staff || []).filter(s => s.role === 'helper')

  return (
    <SchedulesClient 
      initialTechnicians={technicians} 
      initialHelpers={helpers}
      initialSchedules={schedules || []} 
      approvedLeaves={approvedLeaves || []}
    />
  )
}
