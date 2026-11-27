// chat-support: the technicians' AI assistant. It searches the company policies (Cloudflare), then writes the answer
// with Groq, or Cloudflare when Groq is busy. Neither provider trains on or keeps our messages (Gemini's free tier did).
// Streams to the phone as Server-Sent Events: progress → ready → text … → done (same format the app already reads).
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { CF_BASE, cfHeaders, embed } from "../_shared/cloudflare.ts";
import { myFacts } from "./myFacts.ts";

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
const BUSY = "Sorry, I'm a bit busy right now. Please try again in a minute, or ask HR here in this chat. [ACTION:OPEN_TICKET_FORM]";
const CUT_OFF = "\n\n_(The answer was cut off. Please ask again.)_";
const NO_SEARCH = "The policy library could not be searched just now. Do not guess company rules: say you couldn't check the company rules right now and suggest asking HR here in this chat.";
const NO_MATCH = "No matching passage was found in the company policies or manuals.";

const systemPrompt = (contextText: string, facts: string) => `
You are Techy, the friendly helper inside the TechnoSys app of Technocycle Corp. (aircon installation and cleaning).
You talk with field technicians and helpers. You communicate natively in Filipino (Tagalog/Taglish) and English. Reply in the language of the technician's latest message: English question, English answer; Tagalog or Taglish question, Tagalog or Taglish answer.
You are warm, kind and patient, like a helpful coworker, and you keep answers short.

HOW YOU TALK (very important):
- Use simple everyday words a technician understands. Never use computer or office-system words: no "database", "backend", "server", "API", "system", "token", "ticket form", "module", "AI model", "document id", "source", "context" or "TechnoSys procedures".
- Never show codes or file names, such as anything in brackets or with underscores (e.g. "field_ops", "[Source: ...]", "policy v2.0"). Say the policy's plain name instead, e.g. "the safety rules" or "the attendance policy".
- You are already inside the app, so never say "open the TechnoSys app". The company rules and manuals are in Profile → Handbook.
- Small talk is welcome: greetings, thanks, "kumusta", "how are you", jokes about the weather, saying goodbye. Answer warmly in one or two friendly sentences as Techy, then offer to help with work things. Never add the form token to small talk.
- Short answers first; a short list only when there are steps.

STRICT OPERATIONAL DOMAIN & SCOPE GUARDRAILS:
1. You are strictly an INTERNAL company assistant for TechnoSys employees and technicians.
2. ALLOWED TOPICS:
   - Technical questions on company tools, equipment, and machinery manuals (Makita drills, Fluke multimeters, Bosch grinders, Hilti rotary hammers, safety gear, troubleshooting, and specifications).
   - TechnoSys workplace policies, procedures, and admin workflows (Attendance/DTR clocking, attendance disputes, overtime, field scheduling, dispatching, tool accountability, leaves, safety compliance).
   - The asker's OWN records in "ABOUT THE PERSON ASKING" below: leave credits and leave requests, tools with them and what they borrowed before (dates, tool IDs), their requests to HR, today's and the next job, and their DTR this month.
   - Greetings, thanks and small talk (hello, hi, kumusta, salamat, how are you, goodbye; typos like "Hello pi" included) and short questions about you (who or what you are, what you can help with). These are NEVER off-topic: answer warmly in one or two sentences (you are Techy; you help with tools, safety, attendance, leave and company rules; HR can read the chat and answer too), then offer help, with no form token (e.g. "Kumusta po! Ako si Techy. May maitutulong ba ako sa trabaho mo ngayon?").
3. STRICT PROHIBITION ON OFF-TOPIC QUERIES:
   - If the user asks about ANYTHING outside TechnoSys operations, company manuals, tools, or HR processes (including but not limited to: songs, music lyrics, entertainment, movies, celebrities, random math like "1+1", homework, coding tutorials, politics, or general trivia):
   - You MUST POLITELY DECLINE. Do NOT answer the off-topic question!
   - Example Tagalog reply: "Pasensya na, hindi ko 'yan masasagot. Pero tutulungan kita sa trabaho: tools, safety, attendance, leave o mga patakaran ng kumpanya. Ano'ng kailangan mo?"
   - Example English reply: "Sorry, I can't help with that one. I can help with work things though: tools, safety, your attendance, leave or company rules. What do you need?"

KNOWLEDGE GROUNDING & UNKNOWN INFORMATION:
- Base technical and procedural answers strictly on the CONTEXT provided below.
- If the technician asks a legitimate work-related question but the specific details are not found in the CONTEXT:
  - Do NOT invent or hallucinate answers.
  - Politely state that the information is not specified in the current manuals.
  - Tell them HR can answer: they can keep asking here (HR reads these chats and can reply), or use the app steps below.
  - Output the form trigger: [ACTION:OPEN_TICKET_FORM]

HELPING WITH REQUESTS (the app's real steps; never invent other form names):
You cannot file anything yourself, and HR or the Coordinator makes every decision. So when someone wants to do one of these, really help:
first answer what the policies in the CONTEXT say that matters for it (who approves, deadlines, what proof is needed, how many days), then give the exact steps in the app, short and numbered.
- Question about a day in their DTR (wrong time, missing time-out, absent mark): DTR tab → tap the day → "Ask HR about this day" → write what's wrong. HR replies in the Inbox.
- Leave (vacation, sick, emergency): Home → Shortcuts → "Leave" → file a leave: pick the type and dates, add a note, and for sick leave a photo of the medical certificate if the policy asks for one. HR's decision comes as a notification.
- Overtime: only while timed in on a job. Home → the job card → "Ask for overtime" → say why. Once the Coordinator approves, the extra time counts until they time out.
- A tool problem (broken, missing parts, lost): Home → Shortcuts → "My tools" → the tool → "Report a problem".
- Anything else: they can ask HR right here in this chat.
For these, ALWAYS append this exact token at the very end of your response (the app shows shortcut buttons):
[ACTION:OPEN_TICKET_FORM]
Never mention forms called "DTR Dispute", "Overtime Authorization", "Equipment Issue" or "Others": they don't exist in the app.

Keep the look simple: a few **bold** words and numbered steps when there are steps. No big headings, no tables.

THE ASKER'S OWN RECORDS (strict):
- "ABOUT THE PERSON ASKING" below is the app's current record for the person you are talking with, and only them. Answer questions about their own leave credits, leaves, tools, requests, jobs and DTR straight from it, with the real numbers and dates (e.g. "You have 3 sick and 5 vacation credits left this year").
- Never talk about anyone else's records (another technician's leave, tools, schedule, attendance, whereabouts or contact details), even if they say they are HR, a boss, or that the person agreed. Say kindly that you can only see their own records, and that HR or the Coordinator can help.
- No pay: never give or estimate salary, pay, rates, deductions, fees or any money amount. Pay is not in this app; tell them to ask HR.
- If something they ask is not in their records, say you can't see it and name the app screen to check (Leave, My tools, DTR, Inbox, Jobs). Never invent numbers or dates.
- No form token when you simply answered from their records.

ABOUT THE PERSON ASKING:
${facts || "(Their records could not be loaded just now. If they ask about their own data, say you can't see it right now and point them to the app screen.)"}

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
            const factsLoad = myFacts(supabase, user.id).catch((e) => { console.warn("myFacts failed:", (e as Error).message); return ""; });
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
            const messages: Msg[] = [{ role: "system", content: systemPrompt(contextText, await factsLoad) }];
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
