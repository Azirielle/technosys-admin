// loadtest-live-map: pretends N technicians are timed in and sending their position, like the phone does
// (lib/liveLocation.ts: upsert live_locations). Each signs in as itself, so the access rules run too.
// Creates temporary accounts "Load test 01…" and deletes them at the end (also on Ctrl+C, and leftovers of a killed run at the start).
//   npx tsx scripts/loadtest-live-map.ts [people=30] [every seconds=60] [minutes=3]
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const [people, everySec, minutes] = [Number(process.argv[2] ?? 30), Number(process.argv[3] ?? 60), Number(process.argv[4] ?? 3)];
const ids: string[] = [];

async function cleanup() {
  for (const id of ids.splice(0)) await admin.auth.admin.deleteUser(id); // also removes their profile and position
  console.log("Test accounts deleted.");
}

async function signIn(n: number): Promise<{ id: string; db: SupabaseClient }> {
  const email = `loadtest-${String(n).padStart(2, "0")}@technosys.test`;
  const { data: made, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  ids.push(made.user.id);
  const { error: pErr } = await admin.from("profiles").insert({ id: made.user.id, full_name: `Load test ${String(n).padStart(2, "0")}`, role: "technician" });
  if (pErr) throw pErr;
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const db = createClient(url, anon, { auth: { persistSession: false } });
  const { error: vErr } = await db.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: "magiclink" });
  if (vErr) throw vErr;
  return { id: made.user.id, db };
}

async function main() {
  console.log(`${people} people, a position every ${everySec} s, for ${minutes} min.`);
  const { data: old } = await admin.auth.admin.listUsers({ perPage: 1000 });
  ids.push(...(old?.users ?? []).filter((u) => u.email?.startsWith("loadtest-")).map((u) => u.id));
  if (ids.length) await cleanup(); // a killed run left these behind
  const phones = [];
  for (let n = 1; n <= people; n++) phones.push(await signIn(n));

  const times: number[] = [];
  let failed = 0;
  const send = async ({ id, db }: { id: string; db: SupabaseClient }) => {
    const t0 = Date.now();
    const lat = 14.34 + (Math.random() - 0.5) * 0.2, lon = 121.0 + (Math.random() - 0.5) * 0.2; // around Las Piñas
    const { error } = await db.from("live_locations").upsert({ technician_id: id, latitude: lat, longitude: lon, status: "working", updated_at: new Date().toISOString() });
    if (error) { failed++; console.warn(error.message); return; }
    times.push(Date.now() - t0);
  };

  // Phones start at random moments in the first interval, like real people timing in at different times.
  const timers = phones.map((p) => setTimeout(() => { send(p); timers.push(setInterval(() => send(p), everySec * 1000)); }, Math.random() * everySec * 1000));
  await new Promise((r) => setTimeout(r, minutes * 60000));
  timers.forEach((t) => clearInterval(t));

  times.sort((a, b) => a - b);
  const at = (q: number) => times[Math.min(times.length - 1, Math.floor(q * times.length))];
  console.log(`Sent ${times.length}, failed ${failed}. Time per update: typical ${at(0.5)} ms, slowest 5% ${at(0.95)} ms, worst ${times.at(-1)} ms.`);
}

process.on("SIGINT", () => cleanup().then(() => process.exit(1)));
main().catch((e) => console.error("Load test failed:", e.message || e)).finally(cleanup);
