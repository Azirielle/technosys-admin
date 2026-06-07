import { supabaseAdmin } from "@/lib/supabase/admin"
import SchedulesClient from "./SchedulesClient"

export const revalidate = 0; // Prevent caching so we see real-time VIP Hooks

export default async function SchedulesPage() {
  // Fetch real data from our live Supabase
  const { data: technicians } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'technician')
    .order('full_name')

  const { data: helpers } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'helper')
    .order('full_name')

  const { data: schedules } = await supabaseAdmin
    .from('schedules')
    .select('*, technician:profiles(full_name, role)')
    .order('start_time', { ascending: true })

  const { data: approvedLeaves } = await supabaseAdmin
    .from('leaves')
    .select('*')
    .eq('status', 'approved')

  return (
    <SchedulesClient 
      initialTechnicians={technicians || []} 
      initialHelpers={helpers || []}
      initialSchedules={schedules || []} 
      approvedLeaves={approvedLeaves || []}
    />
  )
}
