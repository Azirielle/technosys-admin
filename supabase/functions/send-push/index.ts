// Push notifications to a technician's phone when HR updates their ticket or replies to it.
// Called only by database triggers on tickets and ticket_comments (trigger_push_notification).
// Every value is re-read from the database, so a forged request can at most repeat a real, current notification.
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const ok = (message: string) => new Response(JSON.stringify({ success: true, message }), { headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
  const { type, table, record } = payload || {};
  if (!record?.id) return new Response("Invalid request", { status: 400 });

  let userId: string | null = null;
  let title = "";
  let body = "";
  let data: Record<string, unknown> = {};

  if (table === "tickets") {
    const { data: ticket } = await admin.from("tickets").select("id, employee_id, title, category, status").eq("id", record.id).single();
    if (!ticket?.employee_id) return ok("Ticket not found");
    const name = ticket.title || ticket.category || "your request";
    userId = ticket.employee_id;
    data = { type: "ticket", ticketId: ticket.id };

    if (type === "INSERT") {
      title = "Request received";
      // Tool requests and tool problems go to the Coordinator, everything else to HR (Round 5 P6)
      const who = ["Tool request", "Equipment / Tools"].includes(ticket.category) ? "The Coordinator" : "HR";
      body = `${who} received "${name}" and will review it.`;
    } else {
      // Only when the status really changed, and only to the status it has now.
      if (payload.old_record?.status === ticket.status || record.status !== ticket.status) return ok("No status change");
      if (ticket.status === "resolved") {
        title = "Request approved";
        body = `HR approved and resolved "${name}".`;
      } else if (ticket.status === "closed") {
        title = "Request closed";
        body = `HR closed "${name}". Open the app to see why.`;
      } else {
        title = "Request updated";
        body = `"${name}" is now ${String(ticket.status).replace(/_/g, " ")}.`;
      }
    }
  } else if (table === "ticket_comments") {
    const { data: comment } = await admin
      .from("ticket_comments")
      .select("id, content, sender_role, is_internal, ticket:tickets(id, employee_id, title, category)")
      .eq("id", record.id)
      .single();
    const ticket = (comment as any)?.ticket;
    if (!comment || !ticket?.employee_id) return ok("Message not found");
    if (comment.is_internal || !["admin", "system"].includes(comment.sender_role || "")) return ok("No push for this message");
    userId = ticket.employee_id;
    data = { type: "ticket_comment", ticketId: ticket.id };
    title = `HR replied: ${ticket.title || ticket.category || "your request"}`;
    body = (comment.content || "").replace(/\[DECISION:[^\]]*\]\s*/gi, "").replace(/[*_#>]/g, "").trim().slice(0, 150);
  } else {
    return ok("Nothing to send");
  }

  const { data: rows } = await admin.from("push_tokens").select("token").eq("user_id", userId);
  const tokens = (rows || []).map((r) => r.token).filter((t) => t?.startsWith("ExponentPushToken["));
  if (tokens.length === 0) return ok("No registered phone");

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(tokens.map((to) => ({ to, sound: "default", title, body, data }))),
  });
  const result = await res.json().catch(() => null);

  // Forget phones that uninstalled the app.
  const dead = (result?.data || [])
    .map((r: any, i: number) => (r?.details?.error === "DeviceNotRegistered" ? tokens[i] : null))
    .filter(Boolean);
  if (dead.length) await admin.from("push_tokens").delete().in("token", dead);

  return ok(`Sent to ${tokens.length - dead.length} phone(s)`);
});
