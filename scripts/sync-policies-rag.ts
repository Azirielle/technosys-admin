// sync-policies-rag: rebuilds the AI assistant's whole policy library (document_chunks) from the active policies.
// Publishing or archiving in the admin already updates it; run this only to repair it:  npx tsx scripts/sync-policies-rag.ts
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (search data comes from embed-text / Cloudflare).
import { createClient } from "@supabase/supabase-js";
import { embedTexts } from "./embedText"; // first: loads .env.local
import { addPolicyToLibrary, libraryId } from "../src/lib/policyLibrary";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: policies, error } = await supabase
    .from("policies")
    .select("id, title, category, version, target_audience, content_markdown")
    .eq("is_active", true);
  if (error || !policies?.length) {
    console.error("Couldn't load active policies:", error?.message || "none found");
    process.exit(1);
  }
  console.log(`${policies.length} active policies.`);

  // Remove passages of policies that are no longer active (archived or deleted).
  const keep = new Set(policies.map((p) => libraryId(p.id)));
  const { data: existing } = await supabase.from("document_chunks").select("document_id").like("document_id", "policy_%");
  const stale = [...new Set((existing ?? []).map((r) => r.document_id as string))].filter((id) => !keep.has(id));
  for (const id of stale) {
    await supabase.from("document_chunks").delete().eq("document_id", id);
    console.log(`Removed old passages: ${id}`);
  }

  for (const policy of policies) {
    console.log(`${policy.title} ${policy.version}: ${await addPolicyToLibrary(supabase, policy)} passages`);
  }

  // Quick check that the search still finds something.
  const { data: matches, error: rpcErr } = await supabase.rpc("match_documents", {
    query_embedding: (await embedTexts(["Do I need a medical certificate for sick leave?"]))[0],
    match_threshold: 0.25,
    match_count: 2,
  });
  if (rpcErr) throw rpcErr;
  console.log(`Search check: ${matches?.length ?? 0} matches, top: ${matches?.[0]?.document_id ?? "none"}`);
}

main().catch((err) => {
  console.error("Sync failed:", err.message || err);
  process.exit(1);
});
