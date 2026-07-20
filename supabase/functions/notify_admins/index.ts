import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge Function to handle notifications for Admins
// Triggered by Database Webhooks on `leaves` and `tickets`

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = "-5315218812"; // User's requested group chat ID

serve(async (req) => {
  try {
    const payload = await req.json();
    const table = payload.table; // 'leaves' or 'tickets'
    const record = payload.record; // The new row inserted
    
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("Telegram bot token is not set.");
    }

    // Initialize Supabase Client to fetch names
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let message = "";
    let fullName = "Unknown Employee";

    if (table === "leaves") {
      // Fetch employee name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', record.technician_id)
        .single();
        
      if (profile) fullName = profile.full_name;

      message = `📅 *NEW LEAVE REQUEST*\n\n*Employee:* ${fullName}\n*Reason:* ${record.reason || "Not specified."}\n\n📌 *Reply to this message with "Claimed" to assign this to yourself.*`;
    } else if (table === "tickets") {
      // Fetch employee name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', record.employee_id)
        .single();
        
      if (profile) fullName = profile.full_name;

      message = `🚨 *URGENT TICKET FILED*\n\n*Employee:* ${fullName}\n*Issue:* ${record.description || "No description provided."}\n*Priority:* High\n\n📌 *Reply to this message with "Claimed" to assign this to yourself.*`;
    } else {
      return new Response("No action taken for this table.", { status: 200 });
    }
    
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    return new Response(JSON.stringify({ success: true, method: "telegram" }), { headers: { "Content-Type": "application/json" } });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
