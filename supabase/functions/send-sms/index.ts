// Sends one SMS through Semaphore (Philippine SMS provider) and records it in transactional_sms_logs.
// Only office staff (CEO, HR, Coordinator) or the server itself (service role) may call it.
import { createClient } from "npm:@supabase/supabase-js@2";

const SEMAPHORE_API_URL = "https://api.semaphore.co/api/v4/messages";
const OFFICE_ROLES = ["ceo", "hr", "coordinator"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });

// 09171234567 / +639171234567 / 639171234567 / 9171234567 -> 09171234567, otherwise null
function normalizePhMobile(raw: string): string | null {
  const d = (raw || "").replace(/\D/g, "");
  if (/^09\d{9}$/.test(d)) return d;
  if (/^639\d{9}$/.test(d)) return `0${d.slice(2)}`;
  if (/^9\d{9}$/.test(d)) return `0${d}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Who is calling?
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (token !== serviceKey) {
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Not signed in" }, 401);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !OFFICE_ROLES.includes(profile.role)) return json({ error: "Not allowed" }, 403);
  }

  // 2. What to send
  let payload: { phone?: string; message?: string; type?: string; recipientId?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const phone = normalizePhMobile(payload.phone || "");
  const message = (payload.message || "").trim();
  if (!phone || !message) return json({ error: "A valid 11-digit mobile number and a message are required" }, 400);
  if (message.length > 459) return json({ error: "Message is too long (max 3 SMS parts)" }, 400);

  // 3. Send
  const apiKey = Deno.env.get("SEMAPHORE_API_KEY");
  let status = "not_configured";
  let providerMessageId: string | null = null;
  let errorDetails: string | null = apiKey ? null : "SEMAPHORE_API_KEY is not set";

  if (apiKey) {
    try {
      const form = new URLSearchParams({ apikey: apiKey, number: phone, message });
      const senderName = Deno.env.get("SEMAPHORE_SENDER_NAME");
      if (senderName) form.append("sendername", senderName);
      const res = await fetch(SEMAPHORE_API_URL, { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data) && data[0]?.message_id) {
        status = "sent";
        providerMessageId = String(data[0].message_id);
      } else {
        status = "failed";
        errorDetails = JSON.stringify(data);
      }
    } catch (e) {
      status = "failed";
      errorDetails = e instanceof Error ? e.message : String(e);
    }
  }

  // 4. Record it
  await admin.from("transactional_sms_logs").insert({
    recipient_id: payload.recipientId || null,
    recipient_phone: phone,
    category: payload.type || "GENERAL",
    message,
    cascade_reason: "direct",
    provider: "semaphore",
    provider_message_id: providerMessageId,
    status,
    error_details: errorDetails,
  });

  return json({ success: status === "sent", status, error: errorDetails }, status === "sent" ? 200 : 502);
});
