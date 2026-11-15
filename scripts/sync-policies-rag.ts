// sync-policies-rag: rebuilds the AI assistant's policy library (document_chunks) from the active policies.
// Run after publishing a new policy version:  npx tsx scripts/sync-policies-rag.ts
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env.local.
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error("Missing required environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

// 768 dimensions, matching the match_documents search.
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res = await embeddingModel.embedContent({ content: { role: "user", parts: [{ text }] }, outputDimensionality: 768 } as any);
    return res.embedding.values;
  } catch (err: any) {
    console.warn("Retrying with text-embedding-004...", err.message || err);
    const fallback = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const res = await fallback.embedContent({ content: { role: "user", parts: [{ text }] }, outputDimensionality: 768 } as any);
    return res.embedding.values;
  }
}

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

    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
      const content = `TechnoCycle Official Policy: ${policy.title} (${policy.category})\n${chunks[i].pageContent}`;
      rows.push({
        document_id: docId,
        content,
        metadata: { ...chunks[i].metadata, chunk_index: i, total_chunks: chunks.length },
        embedding: await getEmbedding(content),
      });
      await new Promise((r) => setTimeout(r, 400)); // stay under the API rate limit
    }

    // Replace this policy's passages only after every new one is ready.
    const { error: delErr } = await supabase.from("document_chunks").delete().eq("document_id", docId);
    if (delErr) throw delErr;
    const { error: insErr } = await supabase.from("document_chunks").insert(rows);
    if (insErr) throw insErr;
    console.log(`${policy.title} ${policy.version}: ${rows.length} passages`);
  }

  // Quick check that the search still finds something.
  const { data: matches, error: rpcErr } = await supabase.rpc("match_documents", {
    query_embedding: await getEmbedding("Do I need a medical certificate for sick leave?"),
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
