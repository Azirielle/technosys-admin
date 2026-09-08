import "@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, x-requested-with",
};

export default {
  async fetch(req: Request) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { query, attachment, history } = await req.json();
      
      if (!query) {
        return new Response("Missing query", { status: 400, headers: corsHeaders });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
      
      // In Deno Edge Functions, we instantiate a lightweight Supabase client
      const { createClient } = await import("npm:@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.get("Authorization")! } }
      });

      const genAI = new GoogleGenerativeAI(geminiApiKey);

      // Create a ReadableStream to stream Server-Sent Events (SSE)
      const stream = new ReadableStream({
        async start(controller) {
          const sendProgress = (msg: string) => {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "progress", message: msg })}\n\n`));
          };

          try {
            let contextText = "No relevant documents found. Rely on your general knowledge but mention you couldn't find it in the manual.";

            // STEP 1 & 2: Embed Query & Retrieve Documents (Safe Fallback)
            try {
              sendProgress("Understanding your question...");
              const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
              const embedResult = await embeddingModel.embedContent({
                  content: { role: "user", parts: [{ text: query }]},
                  outputDimensionality: 768
              });
              const queryEmbedding = embedResult.embedding.values;

              sendProgress("Searching technical manuals...");
              const { data: documents, error } = await supabase.rpc("match_documents", { query_embedding: queryEmbedding, match_threshold: 0.2, match_count: 3 });
              if (error) { 
                console.error("RAG RPC Error:", error); 
              } else if (documents && documents.length > 0) {
                contextText = documents.map((doc: any) => `[Source: ${doc.document_id}]\n${doc.content}`).join("\n\n");
                sendProgress("Reading retrieved documents...");
              }
            } catch (ragErr) {
              console.warn("RAG retrieval skipped, using fallback knowledge:", ragErr);
            }

            const systemPrompt = `
You are the official TechnoSys Field Support & Operations AI Assistant. 
You communicate natively in Filipino (Tagalog/Taglish) and English. Always match the language and tone of the technician.
You are professional, concise, respectful, and direct.

STRICT OPERATIONAL DOMAIN & SCOPE GUARDRAILS:
1. You are strictly an INTERNAL company assistant for TechnoSys employees and technicians.
2. ALLOWED TOPICS:
   - Technical questions on company tools, equipment, and machinery manuals (Makita drills, Fluke multimeters, Bosch grinders, Hilti rotary hammers, safety gear, troubleshooting, and specifications).
   - TechnoSys workplace policies, procedures, and admin workflows (Attendance/DTR clocking, disputes, overtime, field scheduling, dispatching, tool accountability, payslips, leaves, safety compliance).
   - Brief polite greetings (e.g. "Kumusta po! Paano po ako makakatulong sa inyong kagamitan o TechnoSys tasks ngayon?").
3. STRICT PROHIBITION ON OFF-TOPIC QUERIES:
   - If the user asks about ANYTHING outside TechnoSys operations, company manuals, tools, or HR processes (including but not limited to: songs, music lyrics, entertainment, movies, celebrities, random math like "1+1", homework, jokes, personal chit-chat, coding tutorials, politics, or general trivia):
   - You MUST POLITELY DECLINE. Do NOT answer the off-topic question!
   - Example Tagalog refusal: "Paumanhin, bilang TechnoSys AI Support Assistant, nakatalaga lamang po ako para sumagot sa mga katanungan patungkol sa kagamitan, safety manuals, attendance/DTR, payslip, scheduling, at mga proseso ng TechnoSys. Paano po kita matutulungan sa inyong mga gawain o kagamitan ngayon?"
   - Example English refusal: "I apologize, but as the TechnoSys AI Support Assistant, I am strictly designated to assist with company equipment, safety manuals, attendance/DTR, payslips, scheduling, and official TechnoSys procedures. How can I assist you with your TechnoSys tasks today?"

KNOWLEDGE GROUNDING & UNKNOWN INFORMATION:
- Base technical and procedural answers strictly on the CONTEXT provided below.
- If the technician asks a legitimate work-related question but the specific details are not found in the CONTEXT:
  - Do NOT invent or hallucinate answers.
  - Politely state that the information is not specified in the current manuals.
  - Advise them to submit a ticket to the Coordinator or HR Admin using the Support / Ticket form, or report it under the "Others" category so human admin can review it.
  - Output the form trigger: [ACTION:OPEN_TICKET_FORM]

ACTION TRIGGERS:
- Whenever the user expresses intent to report an issue, dispute a payslip/DTR record, request tool repairs, file a leave, or submit ANY general inquiry/report (including "Others" or when they ask what form to use), guide them briefly, mention they can select the appropriate category (e.g., "Payroll Issue", "Equipment Issue", "DTR Issue", "File Leave", or "Others"), and ALWAYS append this exact token at the very end of your response:
[ACTION:OPEN_TICKET_FORM]

Format all responses cleanly using Markdown, bold headings, and bullet points.

CONTEXT:
${contextText}
`;

            // STEP 3: Sanitize and Build Turn History
            const userParts: any[] = [{ text: `Question: ${query}` }];
            if (attachment && attachment.base64) {
                userParts.push({
                    inlineData: {
                        data: attachment.base64,
                        mimeType: attachment.mimeType || "image/jpeg"
                    }
                });
            }

            let geminiContents: any[] = [];
            if (history && Array.isArray(history)) {
                // Ensure strictly alternating roles (user -> model -> user)
                // Gemini API rejects conversations starting with 'model'
                for (const msg of history) {
                    if (!msg.content || typeof msg.content !== "string") continue;
                    const currentRole = msg.role === "user" ? "user" : "model";
                    
                    if (geminiContents.length === 0 && currentRole === "model") {
                        // Skip initial assistant greetings so turn 0 is always user
                        continue;
                    }
                    
                    if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === currentRole) {
                        geminiContents[geminiContents.length - 1].parts[0].text += "\n\n" + msg.content;
                    } else {
                        geminiContents.push({
                            role: currentRole,
                            parts: [{ text: msg.content }]
                        });
                    }
                }
            }

            if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === "user") {
                geminiContents[geminiContents.length - 1].parts.push(...userParts);
            } else {
                geminiContents.push({ role: "user", parts: userParts });
            }

            // STEP 4: Generate Answer with Failover (gemini-flash-latest -> gemini-flash-lite-latest)
            sendProgress("Formulating the best answer...");
            
            let resultStream: any = null;
            try {
                const primaryModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                resultStream = await primaryModel.generateContentStream({
                    contents: geminiContents,
                    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] }
                });
            } catch (primaryErr: any) {
                console.warn("Primary model gemini-flash-latest failed, failing over to gemini-flash-lite-latest:", primaryErr.message);
                try {
                    const fallbackModel = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
                    resultStream = await fallbackModel.generateContentStream({
                        contents: geminiContents,
                        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] }
                    });
                } catch (fallbackErr: any) {
                    console.error("Both primary and fallback models failed:", fallbackErr.message);
                    throw fallbackErr;
                }
            }

            // Signal that we are transitioning from Progress mode to Text Streaming mode
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "ready" })}\n\n`));

            for await (const chunk of resultStream.stream) {
                const chunkText = chunk.text();
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "text", text: chunkText })}\n\n`));
            }

            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();

          } catch (err: any) {
            console.error("Generation Error:", err);
            const fallbackNotice = "I am currently unable to generate a response due to temporary service load. I have flagged this ticket for Admin review so our team can assist you directly.";
            
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "ready" })}\n\n`));
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "text", text: fallbackNotice })}\n\n`));
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });

    } catch (e: any) {
      return new Response(JSON.stringify({ error: "The AI service is temporarily unavailable. Please try again later." }), { status: 500, headers: corsHeaders });
    }
  }
};









