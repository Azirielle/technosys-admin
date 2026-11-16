// Mobile sign-in with mobile number + 4-digit PIN (technicians and helpers).
// The database function pin_sign_in checks the PIN (5 tries, then a 15-minute lock) and the
// registered phone (a first sign-in returns "unregistered": the phone is registered later, in setup).
// Only when both pass does this function open a session: it makes a one-time
// sign-in token that the app exchanges with supabase.auth.verifyOtp. Callers are logged out,
// so this function does its own checks (verify_jwt is off); it never returns the email or PIN.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ status: "error" }, 405);

  let body: { mobile?: string; pin?: string; deviceId?: string; deviceName?: string; requestChange?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ status: "error" }, 400);
  }

  const mobile = String(body.mobile ?? "").slice(0, 20);
  const pin = String(body.pin ?? "");
  const deviceId = String(body.deviceId ?? "");
  const deviceName = String(body.deviceName ?? "Phone").slice(0, 80);
  if (!/^[0-9]{4}$/.test(pin)) return json({ status: "wrong_pin_format" });
  if (deviceId.length < 16 || deviceId.length > 100) return json({ status: "error" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data, error } = await admin.rpc("pin_sign_in", {
    p_contact: mobile,
    p_pin: pin,
    p_device_id: deviceId,
    p_device_name: deviceName,
    p_request_change: body.requestChange === true,
  });
  if (error || !data) {
    console.error("pin_sign_in failed", error?.message);
    return json({ status: "error" }, 500);
  }

  const result = data as { status: string; email?: string; tries_left?: number; minutes?: number };
  if (result.status !== "ok" && result.status !== "unregistered") {
    // wrong_pin / locked / other_phone / change_requested / unknown_number / no_pin / inactive / use_email
    const { email: _hidden, ...safe } = result;
    return json(safe);
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: result.email! });
  if (linkError || !link?.properties?.hashed_token) {
    console.error("generateLink failed", linkError?.message);
    return json({ status: "error" }, 500);
  }
  return json({ status: result.status, tokenHash: link.properties.hashed_token });
});
