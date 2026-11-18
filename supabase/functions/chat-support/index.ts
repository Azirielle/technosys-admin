// chat-support: the technicians' AI assistant. It searches the company policies (Cloudflare), then writes the answer
// with Groq, or Cloudflare when Groq is busy. Neither provider trains on or keeps our messages (Gemini's free tier did).
// Streams to the phone as Server-Sent Events: progress → ready → text … → done (same format the app already reads).
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { CF_BASE, cfHeaders, embed } from "../_shared/cloudflare.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, x-requested-with",
};

// Tried in order. The Groq secret was saved as "GROQ API KEY" (with spaces); the other spelling is accepted too.
const WRITERS = [
  { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", model: "openai/gpt-oss-120b",
    headers: () => ({ Authorization: `Bearer ${Deno.env.get("GROQ API KEY") ?? Deno.env.get("GROQ_API_KEY") ?? ""}`, "Content-Type": "application/json" }),
    extra: { reasoning_effort: "low" } },
  { name: "Cloudflare", url: `${CF_BASE}/v1/chat/completions`, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", headers: cfHeaders, extra: {} },
];
const BUSY = "The assistant is busy right now. Please try again in a minute, or file a ticket so HR can help you. [ACTION:OPEN_TICKET_FORM]";
const CUT_OFF = "\n\n_(The answer was cut off. Please ask again.)_";
const NO_SEARCH = "The policy library could not be searched just now. Do not guess company rules: say you couldn't check the policies right now and suggest filing a ticket.";
const NO_MATCH = "No matching passage was found in the company policies or manuals.";

const systemPrompt = (contextText: string) => `
You are the official TechnoSys Field Support & Operations AI Assistant. 
You communicate natively in Filipino (Tagalog/Taglish) and English. Reply in the language of the technician's latest message: English question, English answer; Tagalog or Taglish question, Tagalog or Taglish answer.
You are professional, concise, respectful, and direct.

STRICT OPERATIONAL DOMAIN & SCOPE GUARDRAILS:
1. You are strictly an INTERNAL company assistant for TechnoSys employees and technicians.
2. ALLOWED TOPICS:
   - Technical questions on company tools, equipment, and machinery manuals (Makita drills, Fluke multimeters, Bosch grinders, Hilti rotary hammers, safety gear, troubleshooting, and specifications).
   - TechnoSys workplace policies, procedures, and admin workflows (Attendance/DTR clocking, attendance disputes, overtime, field scheduling, dispatching, tool accountability, leaves, safety compliance).
   - Greetings and thanks (hello, hi, kumusta, salamat; typos like "Hello pi" included) and short questions about you (who or what you are, what you can help with). These are NEVER off-topic: answer warmly in one or two sentences (you are the TechnoSys AI assistant that answers from the company's policies and manuals; HR handles requests), then offer help, with no ticket form token (e.g. "Kumusta po! Paano po ako makakatulong sa inyong kagamitan o TechnoSys tasks ngayon?").
3. STRICT PROHIBITION ON OFF-TOPIC QUERIES:
   - If the user asks about ANYTHING outside TechnoSys operations, company manuals, tools, or HR processes (including but not limited to: songs, music lyrics, entertainment, movies, celebrities, random math like "1+1", homework, jokes, personal chit-chat, coding tutorials, politics, or general trivia):
   - You MUST POLITELY DECLINE. Do NOT answer the off-topic question!
   - Example Tagalog refusal: "Paumanhin, bilang TechnoSys AI Support Assistant, nakatalaga lamang po ako para sumagot sa mga katanungan patungkol sa kagamitan, safety manuals, attendance/DTR, scheduling, at mga proseso ng TechnoSys. Paano po kita matutulungan sa inyong mga gawain o kagamitan ngayon?"
   - Example English refusal: "I apologize, but as the TechnoSys AI Support Assistant, I am strictly designated to assist with company equipment, safety manuals, attendance/DTR, scheduling, and official TechnoSys procedures. How can I assist you with your TechnoSys tasks today?"

KNOWLEDGE GROUNDING & UNKNOWN INFORMATION:
- Base technical and procedural answers strictly on the CONTEXT provided below.
- If the technician asks a legitimate work-related question but the specific details are not found in the CONTEXT:
  - Do NOT invent or hallucinate answers.
  - Politely state that the information is not specified in the current manuals.
  - Advise them to submit a ticket to the Coordinator or HR Admin using the Support / Ticket form, or report it under the "Others" category so human admin can review it.
  - Output the form trigger: [ACTION:OPEN_TICKET_FORM]

ACTION TRIGGERS:
- Whenever the user expresses intent to report an issue, dispute a DTR / attendance record, request overtime, request tool repairs, file a leave, or submit ANY general inquiry/report (including "Others" or when they ask what form to use), guide them briefly, mention they can select the appropriate category (e.g., "DTR Issue", "Equipment Issue", "File Leave", or "Others"), and ALWAYS append this exact token at the very end of your response:
[ACTION:OPEN_TICKET_FORM]

Format all responses cleanly using Markdown, bold headings, and bullet points.

CONTEXT:
${contextText}
`;

type Msg = { role: "system" | "user" | "assistant"; content: string };

/** Reads an OpenAI-style streamed reply and calls onText for each piece. Returns false if nothing was written. */
async function streamReply(res: Response, onText: (t: string) => void): Promise<boolean> {
  const reader = res.body!.getReader(), decoder = new TextDecoder();
  let buffer = "", wrote = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return wrote;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return wrote;
      const piece = JSON.parse(data).choices?.[0]?.delta?.content; // reasoning pieces (gpt-oss) are skipped
      if (piece) { onText(piece); wrote = true; }
    }
  }
}

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
      const { query, history } = await req.json();
      if (!query) return new Response("Missing query", { status: 400, headers: corsHeaders });

      const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      });
      // Only signed-in employees may use the assistant.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Please sign in again." }), { status: 401, headers: corsHeaders });

      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
          let ready = false;
          const text = (t: string) => { if (!ready) { send({ type: "ready" }); ready = true; } send({ type: "text", text: t }); };
          try {
            // 1. Search the policies for the question
            send({ type: "progress", message: "Understanding your question..." });
            let contextText = NO_MATCH;
            try {
              const [queryEmbedding] = await embed([String(query)]);
              send({ type: "progress", message: "Searching company policies..." });
              const { data: documents, error } = await supabase.rpc("match_documents", { query_embedding: queryEmbedding, match_threshold: 0.2, match_count: 3 });
              if (error) throw error;
              if (documents?.length) {
                contextText = documents.map((d: { document_id: string; content: string }) => `[Source: ${d.document_id}]\n${d.content}`).join("\n\n");
                send({ type: "progress", message: "Reading the matching policies..." });
              }
            } catch (searchErr) {
              console.warn("Policy search failed:", (searchErr as Error).message);
              contextText = NO_SEARCH;
            }

            // 2. The conversation: instructions, the last few messages, then the question
            const messages: Msg[] = [{ role: "system", content: systemPrompt(contextText) }];
            for (const m of Array.isArray(history) ? history : []) {
              if (typeof m?.content !== "string" || !m.content) continue;
              const role = m.role === "user" ? "user" : "assistant";
              if (messages.length === 1 && role === "assistant") continue; // start with the technician, not the greeting
              messages.push({ role, content: m.content });
            }
            messages.push({ role: "user", content: `Question: ${query}` });

            // 3. Write the answer: Groq, else Cloudflare; never half an answer followed by a false "flagged" note
            send({ type: "progress", message: "Formulating the best answer..." });
            let answered = false;
            for (const w of WRITERS) {
              try {
                const res = await fetch(w.url, { method: "POST", headers: w.headers(), body: JSON.stringify({ model: w.model, messages, stream: true, ...w.extra }) });
                if (!res.ok) { console.warn(`${w.name} refused: ${res.status} ${(await res.text()).slice(0, 200)}`); continue; }
                answered = await streamReply(res, text);
                if (answered) break;
              } catch (writeErr) {
                console.warn(`${w.name} failed:`, (writeErr as Error).message);
                if (ready) { text(CUT_OFF); answered = true; break; } // already showing part of an answer: don't start a second one
              }
            }
            if (!answered) text(BUSY);
          } catch (err) {
            console.error("chat-support error:", err);
            text(BUSY);
          }
          send({ type: "done" });
          controller.close();
        },
      });

      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
    } catch {
      return new Response(JSON.stringify({ error: "The AI service is temporarily unavailable. Please try again later." }), { status: 500, headers: corsHeaders });
    }
  },
};
