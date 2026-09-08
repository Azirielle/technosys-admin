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

    const payload = await req.json();

    // 0. Optional Asynchronous Receipt Audit Action
    if (payload.action === 'check_receipts') {
      const receiptIds: string[] = payload.receipt_ids || [];
      const tokenMap: Record<string, string> = payload.token_map || {};

      if (receiptIds.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No receipt IDs provided." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const receiptResponse = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: receiptIds }),
      });

      const receiptData = await receiptResponse.json();
      const deadFromReceipts: string[] = [];

      if (receiptData && receiptData.data) {
        for (const [rId, receipt] of Object.entries(receiptData.data) as any) {
          if (receipt.status === 'error') {
            const isDead =
              receipt.details?.error === 'DeviceNotRegistered' ||
              (receipt.message && receipt.message.includes('DeviceNotRegistered'));
            if (isDead) {
              const matchedToken = tokenMap[rId];
              if (matchedToken && !deadFromReceipts.includes(matchedToken)) {
                deadFromReceipts.push(matchedToken);
              }
            }
          }
        }
      }

      if (deadFromReceipts.length > 0) {
        await supabaseClient
          .from('push_tokens')
          .delete()
          .in('token', deadFromReceipts);

        await supabaseClient.from('activity_logs').insert({
          action_type: 'dead_token_purged',
          target_category: 'push_infrastructure',
          description: `Purged ${deadFromReceipts.length} dead push token(s) from Expo receipt verification.`,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        receipts: receiptData,
        purged_tokens: deadFromReceipts,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let title = payload.title;
    let body = payload.body;
    let data = payload.data || {};
    let target_user_id = payload.target_user_id;

    // Detect if this is a Database Webhook payload (from pg_trigger net.http_post)
    if (payload.record) {
      const { type, table, record, old_record } = payload;
      
      if (table === 'tickets') {
        target_user_id = record.employee_id;
        data = { ticketId: record.id, type: 'ticket' };
        
        if (type === 'UPDATE') {
          // If status didn't change, skip unnecessary push notifications
          if (old_record && old_record.status === record.status) {
            return new Response(JSON.stringify({ success: true, message: "Status unchanged, no push dispatched." }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
          
          if (record.status === 'resolved') {
            title = `Ticket Approved (${record.category || 'HR'})`;
            body = `Your ticket "${record.title || record.category}" has been approved and resolved by HR.`;
          } else if (record.status === 'closed') {
            title = `Ticket Refused / Closed (${record.category || 'HR'})`;
            body = `Your ticket "${record.title || record.category}" was closed/refused by HR.`;
          } else {
            title = `Ticket Update (${record.category || 'HR'})`;
            body = `Your ticket status changed to: ${record.status}.`;
          }
        } else if (type === 'INSERT') {
          title = `Ticket Received`;
          body = `Your ticket "${record.title || record.category}" has been filed and queued for HR review.`;
        }
      } else if (table === 'ticket_comments') {
        // Only notify if author is admin or system
        if (record.sender_role !== 'admin' && record.sender_role !== 'system') {
          return new Response(JSON.stringify({ success: true, message: "Comment from technician, no push needed." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        if (record.is_internal) {
          return new Response(JSON.stringify({ success: true, message: "Internal note, skipping push." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Fetch the ticket to get employee_id
        const { data: ticket } = await supabaseClient
          .from('tickets')
          .select('id, employee_id, title, category')
          .eq('id', record.ticket_id)
          .single();

        if (!ticket || !ticket.employee_id) {
          return new Response(JSON.stringify({ success: true, message: "No employee attached to ticket." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        target_user_id = ticket.employee_id;
        data = { ticketId: ticket.id, type: 'ticket_comment' };

        const isApproved = (record.content || '').includes('[DECISION: APPROVED');
        const isRefused = (record.content || '').includes('[DECISION: REFUSED');

        if (isApproved) {
          title = `Ticket Approved (${ticket.category || 'HR'})`;
          body = record.content.replace(/\[DECISION: APPROVED & RESOLVED\]\s*/i, '').replace(/Resolution Note:\s*/i, '').slice(0, 150);
        } else if (isRefused) {
          title = `Ticket Refused (${ticket.category || 'HR'})`;
          body = record.content.replace(/\[DECISION: REFUSED\]\s*/i, '').replace(/Reason:\s*/i, '').slice(0, 150);
        } else {
          title = `New HR Message on Ticket`;
          body = (record.content || '').slice(0, 150);
        }
      }
    }

    // 1. Fetch push tokens
    let tokens: string[] = [];

    if (target_user_id) {
      const { data: userTokens, error } = await supabaseClient
        .from('push_tokens')
        .select('token')
        .eq('user_id', target_user_id);
      
      if (error) throw error;
      tokens = (userTokens || []).map((t: any) => t.token);
    } else {
      // Broadcast to everyone (e.g. general company announcements)
      const { data: allTokens, error } = await supabaseClient
        .from('push_tokens')
        .select('token');
        
      if (error) throw error;
      tokens = (allTokens || []).map((t: any) => t.token);
    }

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No registered push tokens found for recipient." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Construct Expo Push Messages
    const messages = tokens.map((pushToken: string) => ({
      to: pushToken,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      badge: 1,
      title: title || 'TechnoSys Alert',
      body: body || 'You have a new operational notification.',
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

    // 4. Synchronous Dead Token Detection & Auto-Purge
    const deadTokens: string[] = [];
    if (expoData && Array.isArray(expoData.data)) {
      expoData.data.forEach((ticket: any, idx: number) => {
        if (ticket.status === 'error') {
          const isDead =
            ticket.details?.error === 'DeviceNotRegistered' ||
            (ticket.message && ticket.message.includes('not a registered push notification recipient'));
          if (isDead && tokens[idx] && !deadTokens.includes(tokens[idx])) {
            deadTokens.push(tokens[idx]);
          }
        }
      });
    }

    if (deadTokens.length > 0) {
      console.log(`[send-push] Detected ${deadTokens.length} dead token(s). Purging from push_tokens...`);
      const { error: deleteError } = await supabaseClient
        .from('push_tokens')
        .delete()
        .in('token', deadTokens);

      if (deleteError) {
        console.error('[send-push] Failed to delete dead tokens:', deleteError);
      } else {
        console.log('[send-push] Successfully purged dead tokens:', deadTokens);
        
        await supabaseClient.from('activity_logs').insert({
          action_type: 'dead_token_purged',
          target_category: 'push_infrastructure',
          description: `Automatically purged ${deadTokens.length} unregistered Expo push token(s) due to DeviceNotRegistered error.`,
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent: messages.length, 
      purged_tokens: deadTokens,
      expoResponse: expoData 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
