const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function run() {
  const customId = generateUUID();
  console.log("Testing client-side UUID insertion. Generated ID:", customId);

  // 1. Try to insert a ticket with a client-supplied UUID
  const { data, error } = await supabase.from('tickets').insert({
    id: customId,
    employee_id: 'c1738ab0-151b-4cdd-8e88-3e71296a31e6', // Juan's ID
    title: "Test Client-side UUID",
    category: "Other Inquiry",
    priority: "low",
    description: "Testing custom UUID insertion from mobile client.",
    status: "open"
  }).select('*').single();

  if (error) {
    console.error("Insertion failed:", error);
  } else {
    console.log("Insertion succeeded! Inserted record:", data);
    
    // 2. Clean up test record
    const { error: delError } = await supabase.from('tickets').delete().eq('id', customId);
    if (delError) {
      console.error("Cleanup failed:", delError);
    } else {
      console.log("Cleanup succeeded!");
    }
  }
}

run();
