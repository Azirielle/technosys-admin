// embed-text: turns text into the search data used by the AI's policy search (document_chunks), with Cloudflare.
// Server only: the caller must send the service-role key (the policy scripts do); deployed with verify_jwt on. POST { texts } → { vectors }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { embed } from "../_shared/cloudflare.ts";

export default {
  async fetch(req: Request) {
    // The gateway (verify_jwt on) has already checked the key's signature; here we only require the server role.
    const payload = req.headers.get("Authorization")?.split(".")[1] ?? "";
    let role = "";
    try { role = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role; } catch { /* not a key */ }
    if (role !== "service_role") {
      return new Response(JSON.stringify({ error: "Server only" }), { status: 401 });
    }
    try {
      const { texts } = await req.json();
      if (!Array.isArray(texts) || texts.length === 0 || texts.length > 50 || texts.some((t) => typeof t !== "string")) {
        return new Response(JSON.stringify({ error: "Send 1-50 texts" }), { status: 400 });
      }
      return Response.json({ vectors: await embed(texts) });
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 502 });
    }
  },
};
