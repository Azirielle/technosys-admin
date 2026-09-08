import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const { data: queueItems, error: fetchError } = await supabase
      .from('ai_chat_queue')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No items to process." }), { headers: corsHeaders });
    }

    // Claim items
    const idsToClaim = queueItems.map(item => item.id);
    await supabase
      .from('ai_chat_queue')
      .update({ status: 'processing' })
      .in('id', idsToClaim);

    const systemPrompt = `You are the TechnoSys Support Agent. You can understand and speak English, Tagalog, and Taglish natively. Always respond in the same language/tone the user uses. You must be polite, helpful, and natural. When answering technical questions, if you don't know the answer, politely say so. However, you ARE allowed to answer casual greetings, general conversation, or language inquiries normally. IMPORTANT NATIVE UI TOOL CALLING: If the user wants to report a payroll issue, report a DTR issue, or report a broken equipment that needs Admin intervention, you must explain the process briefly and THEN output exactly this string at the end of your message: [ACTION:OPEN_TICKET_FORM]`;
    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let processedCount = 0;
    for (const item of queueItems) {
      try {
        const userParts: any[] = [{ text: `Question: ${item.query}` }];
        
        let geminiContents: any[] = [];
        if (item.history && Array.isArray(item.history)) {
            let lastRole = null;
            for (const msg of item.history) {
                const currentRole = msg.role === "user" ? "user" : "model";
                if (currentRole === lastRole) {
                    geminiContents[geminiContents.length - 1].parts[0].text += "\n\n" + msg.content;
                } else {
                    geminiContents.push({ role: currentRole, parts: [{ text: msg.content }] });
                    lastRole = currentRole;
                }
            }
        }
        geminiContents.push({ role: "user", parts: userParts });

        const result = await chatModel.generateContent({
            contents: geminiContents,
            systemInstruction: { role: "system", parts: [{ text: systemPrompt }] }
        });
        
        const answer = result.response.text();
        
        await supabase
          .from('ai_chat_queue')
          .update({ status: 'completed', response: answer })
          .eq('id', item.id);
          
        processedCount++;
      } catch (e: any) {
         console.error(`Failed to process item ${item.id}:`, e);
         if (e.message && (e.message.includes("429") || e.message.includes("quota") || e.message.includes("rate limit"))) {
             // Re-queue claimed items
             await supabase.from('ai_chat_queue').update({ status: 'waiting' }).in('id', idsToClaim).eq('status', 'processing');
             return new Response(JSON.stringify({ message: `Rate limit hit after ${processedCount} items.` }), { status: 429, headers: corsHeaders });
         } else {
             await supabase.from('ai_chat_queue').update({ status: 'failed', response: "AI Error: " + e.message }).eq('id', item.id);
         }
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${processedCount} items successfully.` }), { headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

