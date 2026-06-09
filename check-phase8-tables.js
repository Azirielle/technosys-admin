const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  // 1. Check physical_biometric_scans table
  console.log("\n--- Checking physical_biometric_scans ---");
  const { data: scans, error: scansError } = await supabase.from('physical_biometric_scans').select('*').limit(1);
  if (scansError) {
    console.error("Error querying physical_biometric_scans:", scansError.message);
  } else {
    console.log("SUCCESS! physical_biometric_scans exists, count:", scans.length);
  }

  // 2. Check announcements table
  console.log("\n--- Checking announcements ---");
  const { data: ann, error: annError } = await supabase.from('announcements').select('*').limit(1);
  if (annError) {
    console.error("Error querying announcements:", annError.message);
  } else {
    console.log("SUCCESS! announcements exists, count:", ann.length);
  }

  // 3. Check holidays table
  console.log("\n--- Checking holidays ---");
  const { data: hol, error: holError } = await supabase.from('holidays').select('*').limit(1);
  if (holError) {
    console.error("Error querying holidays:", holError.message);
  } else {
    console.log("SUCCESS! holidays exists, count:", hol.length);
  }

  // 4. Check profiles table columns
  console.log("\n--- Checking profiles columns ---");
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').limit(1);
  if (profileError) {
    console.error("Error querying profiles:", profileError.message);
  } else if (profiles && profiles.length > 0) {
    const p = profiles[0];
    console.log("Profiles columns:", Object.keys(p));
    console.log("branch_id:", p.branch_id);
    console.log("lifecycle_status:", p.lifecycle_status);
  } else {
    console.log("Profiles table is empty or select returned no records.");
  }
}

check();
