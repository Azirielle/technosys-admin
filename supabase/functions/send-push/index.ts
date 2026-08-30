import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse the payload (can be invoked directly via client or via DB Webhook)
    const payload = await req.json();
    const { title, body, data, target_user_id } = payload;

    // 1. Fetch push tokens
    let tokens: string[] = [];

    if (target_user_id) {
      // Send to a specific user (e.g., Work Order assigned)
      const { data: userTokens, error } = await supabaseClient
        .from('push_tokens')
        .select('token')
        .eq('user_id', target_user_id);
      
      if (error) throw error;
      tokens = userTokens.map(t => t.token);
    } else {
      // Send to EVERYONE (e.g., Company Announcement)
      const { data: allTokens, error } = await supabaseClient
        .from('push_tokens')
        .select('token');
        
      if (error) throw error;
      tokens = allTokens.map(t => t.token);
    }

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No tokens found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Construct Expo Push Messages
    const messages = tokens.map((pushToken) => ({
      to: pushToken,
      sound: 'default',
      badge: 1,
      title: title || 'TechnoSys Alert',
      body: body || 'You have a new notification.',
      data: data || {},
    }));

    // 3. Send to Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoData = await expoResponse.json();

    return new Response(JSON.stringify({ success: true, expoResponse: expoData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
