const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  // 1. Check auth users
  console.log("\n--- Checking Auth Users ---");
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Error listing auth users:", authError);
  } else {
    console.log(`Found ${users.length} auth users:`);
    users.forEach(u => console.log(`- ID: ${u.id}, Email: ${u.email}`));
  }

  // 2. Check profiles
  console.log("\n--- Checking Profiles Table ---");
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
  if (profileError) {
    console.error("Error listing profiles:", profileError);
  } else {
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(p => console.log(`- ID: ${p.id}, Name: ${p.full_name}, Role: ${p.role}`));
  }
}

check();
