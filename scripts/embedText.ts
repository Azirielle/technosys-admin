// embedText: turns texts into the AI policy search data by calling our embed-text function (Cloudflare). Used by the scripts.
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

/** Up to 50 texts per call; returns one 768-number list per text, in the same order. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed-text`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`embed-text ${res.status}: ${await res.text()}`);
  return (await res.json()).vectors;
}
