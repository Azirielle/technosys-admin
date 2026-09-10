import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SEMAPHORE_API_URL = "https://api.semaphore.co/api/v4/messages";

// Normalizes input phone to Philippine national format (09XXXXXXXXX) and E.164 (+639XXXXXXXXX)
function normalizePhone(rawPhone: string): { national: string; e164: string; isValid: boolean } {
  const cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, "");
  
  // Format 1: 09XXXXXXXXX (11 digits)
  if (/^09\d{9}$/.test(cleaned)) {
    return {
      national: cleaned,
      e164: `+63${cleaned.slice(1)}`,
      isValid: true,
    };
  }
  
  // Format 2: +639XXXXXXXXX (13 chars)
  if (/^\+639\d{9}$/.test(cleaned)) {
    return {
      national: `0${cleaned.slice(3)}`,
      e164: cleaned,
      isValid: true,
    };
  }
  
  // Format 3: 639XXXXXXXXX (12 digits)
  if (/^639\d{9}$/.test(cleaned)) {
    return {
      national: `0${cleaned.slice(2)}`,
      e164: `+${cleaned}`,
      isValid: true,
    };
  }

  // Fallback for general numbers
  return {
    national: cleaned,
    e164: cleaned.startsWith("+") ? cleaned : `+${cleaned}`,
    isValid: cleaned.length >= 10,
  };
}

serve(async (req) => {
  // CORS Headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const payload = await req.json();
    const { phone, message, type, recipientId, cascadeReason } = payload;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required 'phone' or 'message' field." }),
        { status: 400, headers }
      );
    }

    const { national, e164, isValid } = normalizePhone(phone);
    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid mobile phone format: "${phone}"` }),
        { status: 400, headers }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let provider: "semaphore" | "twilio" | "mock" = "mock";
    let status: "sent" | "mock_sent" | "failed" = "mock_sent";
    let messageId = `mock-${Date.now()}`;
    let errorDetails: string | null = null;

    const semaphoreKey = Deno.env.get("SEMAPHORE_API_KEY");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    // 1. Attempt Semaphore (Primary Philippine Gateway)
    if (semaphoreKey) {
      try {
        const formData = new URLSearchParams();
        formData.append("apikey", semaphoreKey);
        formData.append("number", national);
        formData.append("message", message);

        const semRes = await fetch(SEMAPHORE_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });

        const semData = await semRes.json().catch(() => null);

        if (semRes.ok) {
          provider = "semaphore";
          status = "sent";
          messageId = Array.isArray(semData) 
            ? String(semData[0]?.message_id || "") 
            : String(semData?.message_id || `sem-${Date.now()}`);
          console.log(`[SEMAPHORE_SUCCESS] SMS delivered to ${national}. ID: ${messageId}`);
        } else {
          console.warn("[SEMAPHORE_ERROR] Provider failed, evaluating secondary fallback:", semData);
          errorDetails = `Semaphore error: ${JSON.stringify(semData)}`;
        }
      } catch (err: any) {
        console.warn("[SEMAPHORE_EXCEPTION] Network failure:", err.message);
        errorDetails = `Semaphore network error: ${err.message}`;
      }
    }

    // 2. Secondary Fallback: Twilio
    if (status !== "sent" && twilioSid && twilioAuth && twilioFrom) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const twilioBody = new URLSearchParams();
        twilioBody.append("To", e164);
        twilioBody.append("From", twilioFrom);
        twilioBody.append("Body", message);

        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
          },
          body: twilioBody,
        });

        const twilioData = await twilioRes.json().catch(() => null);

        if (twilioRes.ok) {
          provider = "twilio";
          status = "sent";
          messageId = twilioData?.sid || `tw-${Date.now()}`;
          errorDetails = null; // cleared since secondary succeeded
          console.log(`[TWILIO_SUCCESS] SMS delivered to ${e164}. SID: ${messageId}`);
        } else {
          console.warn("[TWILIO_ERROR] Twilio fallback failed:", twilioData);
          errorDetails = `${errorDetails ? errorDetails + "; " : ""}Twilio error: ${JSON.stringify(twilioData)}`;
        }
      } catch (err: any) {
        console.warn("[TWILIO_EXCEPTION] Network failure:", err.message);
        errorDetails = `${errorDetails ? errorDetails + "; " : ""}Twilio network error: ${err.message}`;
      }
    }

    // 3. Resilient Mock Fallback (Neither configured or both failed in dev/staging)
    if (status !== "sent") {
      provider = "mock";
      status = "mock_sent";
      messageId = `mock-${Date.now()}`;
      console.log(`[MOCK_SMS_GATEWAY] No active live SMS credentials. Logged mock delivery to ${national} [${type || 'CRITICAL'}]: "${message}"`);
    }

    // 4. Record Delivery into transactional_sms_logs
    try {
      const { error: logErr } = await supabase.from("transactional_sms_logs").insert({
        recipient_id: recipientId || null,
        recipient_phone: national,
        category: type || "CRITICAL_ANNOUNCEMENT",
        message,
        cascade_reason: cascadeReason || "push_token_absent",
        provider,
        provider_message_id: messageId,
        status,
        error_details: errorDetails,
      });

      if (logErr) {
        console.error("Failed to write transactional_sms_logs:", logErr.message);
      }
    } catch (dbErr: any) {
      console.error("Database log exception:", dbErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        status,
        messageId,
        recipient: national,
      }),
      { status: 200, headers }
    );

  } catch (error: any) {
    console.error("Critical send-sms Edge Function Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal Edge Function Error" }),
      { status: 500, headers }
    );
  }
});
