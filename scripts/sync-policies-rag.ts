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

// Gemini embedding model with 768 dimensions matching match_documents RPC
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res = await embeddingModel.embedContent({
      content: { role: "user", parts: [{ text }] },
      outputDimensionality: 768,
    });
    return res.embedding.values;
  } catch (err: any) {
    // Failover to text-embedding-004 if gemini-embedding-2 hits limits
    console.warn("Retrying with text-embedding-004 fallback...", err.message || err);
    const fallbackModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const res = await fallbackModel.embedContent({
      content: { role: "user", parts: [{ text }] },
      outputDimensionality: 768,
    });
    return res.embedding.values;
  }
}

async function main() {
  console.log("=== TechnoCycle Enterprise Policies RAG Sync ===");
  console.log("Fetching active policies from public.company_policies...");

  const { data: policies, error: fetchErr } = await supabase
    .from("company_policies")
    .select("*")
    .eq("is_active", true);

  if (fetchErr || !policies || policies.length === 0) {
    console.error("Failed to fetch policies:", fetchErr?.message || "No policies found");
    process.exit(1);
  }

  console.log(`Found ${policies.length} active policies. Preparing vector ingestion...`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600,
    chunkOverlap: 80,
  });

  for (const policy of policies) {
    const docId = `policy_${policy.id}`;
    console.log(`\nProcessing Policy: ${policy.title} (${docId})`);

    // Clean up previous chunks for this policy
    const { error: delErr } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", docId);

    if (delErr) {
      console.warn(`Warning deleting old chunks for ${docId}:`, delErr.message);
    }

    // Split policy content into rich chunks
    const chunks = await splitter.createDocuments(
      [policy.content_markdown],
      [
        {
          policy_id: policy.id,
          title: policy.title,
          category: policy.category,
          version: policy.version,
          target_audience: policy.target_audience,
        },
      ]
    );

    console.log(`Created ${chunks.length} chunks. Generating embeddings...`);

    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contextAugmentedText = `TechnoCycle Official Policy: ${policy.title} (${policy.category})\n${chunk.pageContent}`;
      
      const embedding = await getEmbedding(contextAugmentedText);
      rows.push({
        document_id: docId,
        content: contextAugmentedText,
        metadata: {
          ...chunk.metadata,
          chunk_index: i,
          total_chunks: chunks.length,
        },
        embedding,
      });

      // Brief delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    // Insert new chunks into Supabase
    const { error: insErr } = await supabase.from("document_chunks").insert(rows);
    if (insErr) {
      console.error(`Error inserting chunks for ${docId}:`, insErr.message);
    } else {
      console.log(`✅ Successfully ingested ${rows.length} vector chunks for ${policy.id}`);
    }
  }

  // Verification Search
  console.log("\n--- Testing Vector Retrieval via match_documents RPC ---");
  const testQuery = "What is the policy for sick leave medical certificates?";
  console.log(`Query: "${testQuery}"`);
  
  const queryEmbedding = await getEmbedding(testQuery);
  const { data: matches, error: rpcErr } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.25,
    match_count: 2,
  });

  if (rpcErr) {
    console.error("match_documents test error:", rpcErr);
  } else {
    console.log(`Retrieved ${matches?.length || 0} matching document chunks:`);
    matches?.forEach((m: any, idx: number) => {
      console.log(`\n[Match #${idx + 1} | Similarity: ${(m.similarity * 100).toFixed(1)}% | Source: ${m.document_id}]`);
      console.log(m.content.slice(0, 200) + "...");
    });
  }

  console.log("\n✅ Chunk 37.1 Vector Sync Completed Successfully.");
}

main().catch((err) => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
