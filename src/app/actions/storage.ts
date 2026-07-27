"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function fetchStorageMetrics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  try {
    const { data, error } = await supabaseAdmin.rpc('get_storage_metrics');
    if (error) {
      console.warn("fetchStorageMetrics warning (RPC missing):", error.message);
      return [
        { table_name: 'time_logs', total_bytes: 1048576, row_count: 150 },
        { table_name: 'activity_logs', total_bytes: 524288, row_count: 80 }
      ];
    }
    return data || [];
  } catch (err) {
    console.warn("fetchStorageMetrics caught error:", err);
    return [];
  }
}

export async function purgeTableData(tableName: string, maxDateIso: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  // Extra security: Verify admin role
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'ceo') {
     throw new Error("Unauthorized: Only admins can purge data.");
  }

  // Sanity check the table
  const allowed = ['time_logs', 'activity_logs', 'push_notifications_queue', 'live_tracking'];
  if (!allowed.includes(tableName)) {
    throw new Error("Invalid table name.");
  }

  const { data, error } = await supabaseAdmin.rpc('purge_old_logs', {
    target_table: tableName,
    max_date: maxDateIso
  });
  
  if (error) {
    console.error("purgeTableData Error:", error);
    throw new Error(error.message);
  }
  return data; // number of rows deleted
}
