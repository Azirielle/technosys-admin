// policyLibrary: keeps the AI assistant's policy passages (document_chunks) in step with the active policies.
// Server only (service-role key). Used when HR publishes or archives a policy, and by scripts/sync-policies-rag.ts.
import type { SupabaseClient } from '@supabase/supabase-js'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

type LibraryPolicy = {
  id: string
  title: string
  category: string
  version: string
  target_audience: string | null
  content_markdown: string
}

/** Turns texts (up to 50) into the AI's search data, through our embed-text function (Cloudflare). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed-text`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  })
  if (!res.ok) throw new Error(`embed-text ${res.status}: ${await res.text()}`)
  return (await res.json()).vectors
}

/** A new version's id is "<original id>_rev_<…>". The library keeps one entry per policy, under the original id. */
export function libraryId(policyId: string) {
  return `policy_${policyId.replace(/_rev_.*$/, '')}`
}

/** Puts this version of a policy in the AI's library, replacing the policy's older passages. Returns the passage count. */
export async function addPolicyToLibrary(db: SupabaseClient, policy: LibraryPolicy): Promise<number> {
  const docId = libraryId(policy.id)
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 80 })
  const chunks = await splitter.createDocuments(
    [policy.content_markdown],
    [{ policy_id: policy.id, title: policy.title, category: policy.category, version: policy.version, target_audience: policy.target_audience }],
  )
  const contents = chunks.map((c) => `TechnoCycle Official Policy: ${policy.title} (${policy.category})\n${c.pageContent}`)
  const vectors: number[][] = []
  for (let i = 0; i < contents.length; i += 50) vectors.push(...(await embedTexts(contents.slice(i, i + 50))))
  const rows = contents.map((content, i) => ({
    document_id: docId,
    content,
    metadata: { ...chunks[i].metadata, chunk_index: i, total_chunks: chunks.length },
    embedding: vectors[i],
  }))

  // Replace the old passages only after every new one is ready, so a Cloudflare failure leaves the old version answering.
  const { error: delErr } = await db.from('document_chunks').delete().eq('document_id', docId)
  if (delErr) throw delErr
  const { error: insErr } = await db.from('document_chunks').insert(rows)
  if (insErr) throw insErr
  return rows.length
}

/** Takes a policy out of the AI's library (it was archived). */
export async function removePolicyFromLibrary(db: SupabaseClient, policyId: string) {
  const { error } = await db.from('document_chunks').delete().eq('document_id', libraryId(policyId))
  if (error) throw error
}
