// Cloudflare Workers AI, shared by chat-support and embed-text. Cloudflare doesn't train on or keep what we send.
export const CF_ACCOUNT_ID = "1f6693ba361cd75d00223ec07d8aa8f6"; // not a secret; the token is (secret CF_API_KEY)
export const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai`;
export const cfHeaders = () => ({ Authorization: `Bearer ${Deno.env.get("CF_API_KEY") ?? ""}`, "Content-Type": "application/json" });

const EMBED_MODEL = "@cf/google/embeddinggemma-300m"; // 100+ languages (Tagalog questions, English policies), 768 numbers

/** Turns texts into the 768-number search data used by match_documents (document_chunks.embedding). */
export async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${CF_BASE}/run/${EMBED_MODEL}`, { method: "POST", headers: cfHeaders(), body: JSON.stringify({ text: texts }) });
  if (!res.ok) throw new Error(`Cloudflare embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const vectors = (await res.json()).result?.data as number[][] | undefined;
  if (!vectors || vectors.length !== texts.length || vectors.some((v) => v.length !== 768)) throw new Error("Unexpected embedding shape");
  return vectors;
}
