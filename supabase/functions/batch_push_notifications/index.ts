// Retired 2026-11-14: pushes are sent directly by the admin server (lib/push.ts) and send-push.
// Delete this function in Supabase > Edge Functions.
Deno.serve(() => new Response(JSON.stringify({ error: "This function has been retired." }), { status: 410, headers: { "Content-Type": "application/json" } }));
