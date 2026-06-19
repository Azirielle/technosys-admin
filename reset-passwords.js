const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reset() {
  console.log("Setting passwords for testing...");
  
  // Juan
  const { data: userJuan, error: errJuan } = await supabase.auth.admin.updateUserById(
    'c1738ab0-151b-4cdd-8e88-3e71296a31e6',
    { password: 'password123' }
  );
  if (errJuan) {
    console.error("Error updating Juan:", errJuan);
  } else {
    console.log("Successfully set Juan Dela Cruz password to 'password123'");
  }

  // Christine
  const { data: userChristine, error: errChristine } = await supabase.auth.admin.updateUserById(
    '4fc65a70-7ccf-4ca8-b5e4-06ef8a30b283',
    { password: 'password123' }
  );
  if (errChristine) {
    console.error("Error updating Christine:", errChristine);
  } else {
    console.log("Successfully set Christine Joy password to 'password123'");
  }
}

reset();
