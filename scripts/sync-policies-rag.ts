// sync-policies-rag: rebuilds the AI assistant's policy library (document_chunks) from the active policies.
// Run after publishing a new policy version:  npx tsx scripts/sync-policies-rag.ts
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (search data comes from embed-text / Cloudflare).
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedTexts } from "./embedText";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/** A new version's id is "<original id>_rev_<…>". The library keeps one entry per policy, under the original id. */
function libraryId(policyId: string) {
  return `policy_${policyId.replace(/_rev_.*$/, "")}`;
}

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

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 80 });

  for (const policy of policies) {
    const docId = libraryId(policy.id);
    const chunks = await splitter.createDocuments(
      [policy.content_markdown],
      [{ policy_id: policy.id, title: policy.title, category: policy.category, version: policy.version, target_audience: policy.target_audience }],
    );

    const contents = chunks.map((c) => `TechnoCycle Official Policy: ${policy.title} (${policy.category})
${c.pageContent}`);
    const vectors: number[][] = [];
    for (let i = 0; i < contents.length; i += 50) vectors.push(...(await embedTexts(contents.slice(i, i + 50))));
    const rows = contents.map((content, i) => ({
      document_id: docId,
      content,
      metadata: { ...chunks[i].metadata, chunk_index: i, total_chunks: chunks.length },
      embedding: vectors[i],
    }));

    // Replace this policy's passages only after every new one is ready.
    const { error: delErr } = await supabase.from("document_chunks").delete().eq("document_id", docId);
    if (delErr) throw delErr;
    const { error: insErr } = await supabase.from("document_chunks").insert(rows);
    if (insErr) throw insErr;
    console.log(`${policy.title} ${policy.version}: ${rows.length} passages`);
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
