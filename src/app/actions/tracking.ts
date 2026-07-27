"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"

export type ActiveTechnician = {
  technician_id: string;
  full_name: string;
  avatar_url?: string;
  app_time_in: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  last_updated: string | null;
}

export async function getActiveTechniciansLocations(): Promise<ActiveTechnician[]> {
  try {
    const { authorized } = await verifyRoleAccess('overview', false)
    if (!authorized) return []

    // Fetch active time logs (clocked in, but not clocked out)
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('time_logs')
      .select('technician_id, app_time_in, technician:profiles!technician_id(full_name, avatar_url)')
      .is('app_time_out', null)

    if (logsError || !logs || logs.length === 0) return []

    const technicianIds = logs.map(log => log.technician_id)

    // Fetch their current locations from technician_locations
    const { data: locations, error: locError } = await supabaseAdmin
      .from('technician_locations')
      .select('technician_id, latitude, longitude, status, updated_at')
      .in('technician_id', technicianIds)

    if (locError) {
      console.error("Failed to fetch tracking locations:", locError.message)
    }

    const locationsMap = new Map();
    locations?.forEach(loc => locationsMap.set(loc.technician_id, loc));

    // Merge the data
    const result: ActiveTechnician[] = logs.map(log => {
      const tech = Array.isArray(log.technician) ? log.technician[0] : log.technician;
      const loc = locationsMap.get(log.technician_id);

      return {
        technician_id: log.technician_id,
        full_name: (tech as any)?.full_name || 'Unknown Technician',
        avatar_url: (tech as any)?.avatar_url,
        app_time_in: log.app_time_in,
        latitude: loc ? parseFloat(loc.latitude) : null,
        longitude: loc ? parseFloat(loc.longitude) : null,
        status: loc?.status || 'working',
        last_updated: loc?.updated_at || null
      }
    });

    return result;
  } catch (err: any) {
    console.error("Error fetching active tracking locations:", err.message)
    return []
  }
}
