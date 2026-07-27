import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const SEMAPHORE_API_URL = "https://api.semaphore.co/api/v4/messages";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    try {
      // 1. Get the request payload
      const { phone, message, type } = await req.json();

      if (!phone || !message) {
        return new Response(JSON.stringify({ error: "Missing 'phone' or 'message' parameters" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 2. Format the phone number (Semaphore expects standard 11 digits or +639 format)
      // Usually +639 is safest, but Semaphore handles standard PH formats.
      
      const apiKey = Deno.env.get("SEMAPHORE_API_KEY");
      
      if (!apiKey) {
        console.error("SEMAPHORE_API_KEY is not set in Edge Function secrets.");
        return new Response(JSON.stringify({ error: "Server configuration error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 3. Prepare payload for Semaphore
      const formData = new URLSearchParams();
      formData.append("apikey", apiKey);
      formData.append("number", phone);
      formData.append("message", message);
      // Optional: If you register a sender name, add it here:
      // formData.append("sendername", "TECHNOSYS");

      // 4. Send request to Semaphore
      console.log(`Sending SMS to ${phone}. Type: ${type || 'UNKNOWN'}`);
      
      const response = await fetch(SEMAPHORE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { message: "Failed to parse Semaphore response" };
      }

      if (!response.ok) {
        console.error("Semaphore API Error:", data);
        return new Response(JSON.stringify({ error: "Failed to send SMS via provider", details: data }), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 5. Success
      console.log("SMS sent successfully:", data);
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error: any) {
      console.error("Internal Edge Function Error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
};
