// Retired 2026-11-14: admin alerts no longer go to Telegram (ticket alerts will use SMS).
// Delete this function in Supabase > Edge Functions, and the TELEGRAM_BOT_TOKEN secret.
Deno.serve(() => new Response(JSON.stringify({ error: "This function has been retired." }), { status: 410, headers: { "Content-Type": "application/json" } }));
