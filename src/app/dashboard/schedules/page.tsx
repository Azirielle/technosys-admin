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

  const { data: schedules } = await supabaseAdmin
    .from('schedules')
    .select('*, technician:profiles(full_name)')
    .order('start_time', { ascending: true })

  return <SchedulesClient initialTechnicians={technicians || []} initialSchedules={schedules || []} />
}
