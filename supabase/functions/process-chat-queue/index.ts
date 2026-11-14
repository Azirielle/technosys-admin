// Retired 2026-11-14: the AI chat queue was removed; chat-support streams answers directly.
// Delete this function in Supabase > Edge Functions.
Deno.serve(() => new Response(JSON.stringify({ error: "This function has been retired." }), { status: 410, headers: { "Content-Type": "application/json" } }));
