const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const { data, error } = await supabase.from('office_locations').select('*');
  if (error) {
    console.error("Error fetching office_locations:", error);
  } else {
    console.log("Success! office_locations exists:", data);
  }
}

check();
