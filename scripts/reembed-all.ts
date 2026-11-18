// reembed-all: one-off. Re-makes the search data of every passage in document_chunks with Cloudflare (was Gemini),
// so questions and passages are compared with the same model. Run once:  npx tsx scripts/reembed-all.ts
import { createClient } from "@supabase/supabase-js";
import { embedTexts } from "./embedText";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: rows, error } = await supabase.from("document_chunks").select("id, content").order("id");
  if (error || !rows) throw error ?? new Error("No passages");
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const vectors = await embedTexts(batch.map((r) => r.content));
    for (let j = 0; j < batch.length; j++) {
      const { error: upErr } = await supabase.from("document_chunks").update({ embedding: vectors[j] }).eq("id", batch[j].id);
      if (upErr) throw upErr;
    }
    console.log(`${Math.min(i + 50, rows.length)} / ${rows.length}`);
  }
  const [check] = await embedTexts(["Do I need a medical certificate for sick leave?"]);
  const { data: matches } = await supabase.rpc("match_documents", { query_embedding: check, match_threshold: 0.2, match_count: 2 });
  console.log(`Search check: ${matches?.length ?? 0} matches, top: ${matches?.[0]?.document_id ?? "none"}`);
}

main().catch((err) => {
  console.error("Re-embed failed:", err.message || err);
  process.exit(1);
});
