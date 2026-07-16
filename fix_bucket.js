const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  // 300 MB limit = 300 * 1024 * 1024
  const sizeLimit = 314572800;
  
  const { data, error } = await supabase.storage.updateBucket('app-releases', {
    fileSizeLimit: sizeLimit
  });

  if (error) {
    console.error("Error updating bucket:", error);
  } else {
    console.log("Bucket updated successfully! Size limit set to:", sizeLimit);
  }
}

fix();
