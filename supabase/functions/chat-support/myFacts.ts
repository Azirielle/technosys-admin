// myFacts: the asker's OWN records for Techy (task 4, 27 Nov): leave credits and leaves, tools with them and borrow
// history (dates, tool IDs), tickets, today's and the next job, and this month's DTR. Read with the asker's own
// sign-in, so the database's access rules (RLS) only ever return their rows; every query also filters by their id.
// No pay or money amounts (tool damage fees are left out on purpose). Any part that fails is just left out.
import type { SupabaseClient } from "npm:@supabase/supabase-js";

const manilaToday = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }) : "");
const clock = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }) : "");
const one = <T>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);

export async function myFacts(sb: SupabaseClient, uid: string): Promise<string> {
  const today = manilaToday();
  const monthStart = `${today.slice(0, 8)}01`;
  const [me, credits, leaves, tools, tickets, jobs, days] = await Promise.all([
    sb.from("profiles").select("full_name, role, technician_level").eq("id", uid).maybeSingle(),
    sb.rpc("leave_credits", { p_person: uid }),
    sb.from("leaves").select("leave_type, start_date, end_date, status, rejection_reason").eq("technician_id", uid)
      .order("start_date", { ascending: false }).limit(6),
    sb.from("tool_borrowings").select("status, quantity, handed_over_at, returned_at, tool:tools ( name, serial_number ), unit:tool_units ( tag )")
      .eq("technician_id", uid).order("handed_over_at", { ascending: false }).limit(15),
    sb.from("tickets").select("title, category, status, created_at").eq("employee_id", uid).or("is_archived.is.null,is_archived.eq.false")
      .order("created_at", { ascending: false }).limit(6),
    sb.from("job_members").select("job:jobs!inner ( client_name, address, start_date, end_date, start_time, end_time, work_type, is_vip, status )")
      .eq("person_id", uid).is("removed_at", null).gte("job.end_date", today).neq("job.status", "cancelled"),
    sb.from("work_days").select("work_date, time_in, time_out, hours, late_minutes, status").eq("person_id", uid)
      .gte("work_date", monthStart).order("work_date"),
  ]);

  const out: string[] = [`Today is ${day(`${today}T04:00:00Z`)} (Philippines).`];
  const p = me.data;
  if (p) out.push(`Name: ${p.full_name ?? "?"}; role: ${p.role}${p.technician_level ? ` (${p.technician_level})` : ""}.`);

  const c = credits.data as { sick_left?: number; vacation_left?: number; without_credits?: number } | null;
  if (c && !credits.error) {
    out.push(`Leave credits this year (company rule: 5 sick + 5 vacation a year; sick leave uses vacation credits once sick runs out): ${c.sick_left} sick left, ${c.vacation_left} vacation left${c.without_credits ? `, ${c.without_credits} day(s) already without credits` : ""}.`);
  }

  if (leaves.data) {
    out.push(leaves.data.length
      ? `Their leave requests (newest first):\n${leaves.data.map((l) => `- ${l.leave_type} ${day(l.start_date)}–${day(l.end_date)}: ${l.status}${l.rejection_reason ? ` (HR's reason: ${l.rejection_reason})` : ""}`).join("\n")}`
      : "Their leave requests: none.");
  }

  if (tools.data) {
    const rows = tools.data.map((b) => {
      const t = one(b.tool as { name?: string; serial_number?: string } | null);
      const u = one(b.unit as { tag?: string } | null);
      const id = u?.tag ?? t?.serial_number;
      return { out: !b.returned_at, text: `${t?.name ?? "Tool"}${id ? ` (ID ${id})` : ""}${(b.quantity ?? 1) > 1 ? ` ×${b.quantity}` : ""}, handed over ${day(b.handed_over_at)}${b.returned_at ? `, ${b.status === "returned" ? "returned" : `checked in as ${b.status}`} ${day(b.returned_at)}` : ""}` };
    });
    const withThem = rows.filter((r) => r.out);
    out.push(withThem.length ? `Tools with them now:\n${withThem.map((r) => `- ${r.text}`).join("\n")}` : "Tools with them now: none.");
    const returned = rows.filter((r) => !r.out);
    if (returned.length) out.push(`Borrow history (checked back in):\n${returned.map((r) => `- ${r.text}`).join("\n")}`);
  }

  if (tickets.data) {
    out.push(tickets.data.length
      ? `Their requests to HR / the office (newest first):\n${tickets.data.map((t) => `- "${t.title}" (${t.category}): ${t.status.replace(/_/g, " ")}, sent ${day(t.created_at)}`).join("\n")}`
      : "Their requests to HR / the office: none.");
  }

  if (jobs.data) {
    type J = Record<string, string | boolean>;
    const list = jobs.data.map((m) => one<J>(m.job as J | J[] | null)).filter(Boolean)
      .sort((a, b) => String(a!.start_date).localeCompare(String(b!.start_date))) as Record<string, string | boolean>[];
    const kind = (j: Record<string, string | boolean>) => `${j.is_vip ? "VIP " : ""}${String(j.work_type).replace(/_/g, "-")}`;
    const line = (j: Record<string, string | boolean>) => `${j.client_name}, ${j.address}, ${String(j.start_time).slice(0, 5)}–${String(j.end_time).slice(0, 5)}, ${kind(j)}${j.start_date !== j.end_date ? `, ${day(String(j.start_date))}–${day(String(j.end_date))}` : ""}`;
    const now = list.filter((j) => String(j.start_date) <= today);
    const next = list.find((j) => String(j.start_date) > today);
    out.push(now.length ? `Today's job: ${now.map(line).join("; ")}.` : "Today's job: none scheduled (wait for the Coordinator).");
    if (next) out.push(`Next job: ${day(String(next.start_date))}: ${line(next)}.`);
  }

  if (days.data) {
    const d = days.data;
    const hours = d.reduce((sum, x) => sum + Number(x.hours ?? 0), 0);
    const late = d.filter((x) => (x.late_minutes ?? 0) > 0);
    out.push(`DTR this month (from ${day(monthStart)}): ${d.length} day(s) timed in, ${hours.toFixed(1)} hours counted, late ${late.length} time(s)${late.length ? ` (${late.reduce((s, x) => s + (x.late_minutes ?? 0), 0)} min in all)` : ""}, ${d.filter((x) => !x.time_out).length} without a time-out, ${d.filter((x) => x.status === "needs_review").length} waiting for HR's check.`);
    const last = d.slice(-5).map((x) => `- ${day(x.work_date)}: in ${clock(x.time_in)}${x.time_out ? `, out ${clock(x.time_out)}` : ", no time-out yet"}${x.hours != null ? `, ${Number(x.hours).toFixed(1)} h` : ""}${(x.late_minutes ?? 0) > 0 ? `, ${x.late_minutes} min late` : ""}`);
    if (last.length) out.push(`Their latest days:\n${last.join("\n")}`);
  }
  return out.join("\n");
}
