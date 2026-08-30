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
            // STEP 1: Embed Query
            sendProgress("Understanding your question...");
            const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
            const embedResult = await embeddingModel.embedContent({
                content: { role: "user", parts: [{ text: query }]},
                outputDimensionality: 768
            });
            const queryEmbedding = embedResult.embedding.values;

            // STEP 2: Retrieve Documents
            sendProgress("Searching technical manuals...");
            const { data: documents, error } = await supabase.rpc("match_documents", { query_embedding: queryEmbedding, match_threshold: 0.2, match_count: 3 });
            if (error) { console.error("RAG Error:", error); } // Fail silently if DB search fails, let AI answer without context

            // STEP 3: Augment Prompt
            sendProgress("Reading retrieved documents...");
            let contextText = "";
            if (documents && documents.length > 0) {
                contextText = documents.map((doc: any) => `[Source: ${doc.document_id}]\n${doc.content}`).join("\n\n");
            } else {
                contextText = "No relevant documents found. Rely on your general knowledge but mention you couldn't find it in the manual.";
            }

            const systemPrompt = `
You are the TechnoSys Support Agent. 
You can understand and speak English, Tagalog, and Taglish natively. Always respond in the same language/tone the user uses.
You must be polite, helpful, and natural.

When answering technical questions, base your answers primarily on the CONTEXT below. If the specific technical answer is not in the context, politely say so (e.g. "Sorry, I can't find that in the manual"). However, you ARE allowed to answer casual greetings, general conversation, or language inquiries normally without needing them to be in the context!

IMPORTANT NATIVE UI TOOL CALLING:
If the user wants to dispute a payroll, report a DTR issue, or report a broken equipment that needs Admin intervention, you must explain the process briefly and THEN output exactly this string at the end of your message:
[ACTION:OPEN_TICKET_FORM]
This will trigger the app to render a native submission form for them.

Format your answer nicely with markdown, bullet points, and bold text if necessary.

CONTEXT:
${contextText}
`;

            // STEP 4: Generate Answer
            sendProgress("Formulating the best answer...");
            const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
                geminiContents = history.map((msg: any) => ({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                }));
            }
            geminiContents.push({ role: "user", parts: userParts });

            const resultStream = await chatModel.generateContentStream({
                contents: geminiContents,
                systemInstruction: { role: "system", parts: [{ text: systemPrompt }] }
            });

            // Signal that we are transitioning from Progress mode to Text Streaming mode
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "ready" })}\n\n`));

            for await (const chunk of resultStream.stream) {
                const chunkText = chunk.text();
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "text", text: chunkText })}\n\n`));
            }

            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();

          } catch (err: any) {
            let safeError = err.message || "Unknown error";
            if (err.message && (err.message.includes("429") || err.message.includes("quota") || err.message.includes("rate limit"))) {
              console.log("Rate limit triggered, telling client to queue.");
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "rate_limited" })}\n\n`));
              controller.close();
              return;
            }
            console.error("Stream Error:", err);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "error", message: safeError })}\n\n`));
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








