import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Edge Function to handle notifications for Admins
// Triggered by Database Webhooks on `leaves` and `tickets`

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

serve(async (req) => {
  try {
    const payload = await req.json();
    const table = payload.table; // 'leaves' or 'tickets'
    const record = payload.record; // The new row inserted
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error("Telegram keys are not set.");
    }

    let message = "";

    if (table === "leaves") {
      message = `📅 *NEW LEAVE REQUEST*\n\nTechnician ID: ${record.technician_id}\nReason: ${record.reason || "Not specified."}\n\nPlease review it in the Admin Dashboard.`;
    } else if (table === "tickets") {
      message = `🚨 *URGENT TICKET FILED*\n\nEmployee ID: ${record.employee_id}\nIssue: ${record.description || "No description provided."}\nPriority: High\n\nPlease check the dashboard immediately.`;
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
