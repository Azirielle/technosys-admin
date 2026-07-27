import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch un-sent notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('push_notifications_queue')
      .select(`
        id,
        user_id,
        title,
        body,
        data,
        push_tokens!inner(token)
      `)
      .eq('status', 'pending')
      .limit(100);

    if (fetchError) throw fetchError;
    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No notifications to send" }), { headers: { "Content-Type": "application/json" } });
    }

    // 2. Format for Expo API
    const messages = [];
    const idsToUpdate = [];

    for (const notif of notifications) {
      if (notif.push_tokens && notif.push_tokens.length > 0) {
        const tokens = Array.isArray(notif.push_tokens) ? notif.push_tokens : [notif.push_tokens];
        
        for (const pt of tokens) {
          if (pt.token) {
            messages.push({
              to: pt.token,
              sound: 'default',
              title: notif.title,
              body: notif.body,
              data: notif.data,
            });
          }
        }
      }
      idsToUpdate.push(notif.id);
    }

    // 3. Send batches to Expo (Expo accepts max 100 per request)
    if (messages.length > 0) {
      const expoRes = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages)
      });
      
      const expoData = await expoRes.json();
      console.log('Expo Response:', expoData);
    }

    // 4. Mark as sent
    if (idsToUpdate.length > 0) {
      await supabase
        .from('push_notifications_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .in('id', idsToUpdate);
    }

    return new Response(JSON.stringify({ success: true, sentCount: messages.length }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
