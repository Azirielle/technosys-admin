// Scheduling status words, kept apart on purpose: availability (can they take a job?), attendance (did their
// phone time in?) and clashes (two jobs at once). Also "Needs you": each problem with its next step.
// Plain functions; no database calls.
import type { Job } from '@/components/jobs/jobTypes'
import { atRisk, checksOf, clock12, dayLogOf, jobsOf, jobsOn, leaveOf, manilaClock, mins, onLeave, type Sched, type Tone } from './scheduleMath'

export type Label = { label: string; tone: Tone; detail?: string }

/** Can this person take a job that day? Available / Assigned / On leave / Leave waiting for HR. */
export function availabilityOf(S: Sched, personId: string, date: string): Label {
  const l = leaveOf(S, personId, date), js = jobsOf(S, personId, date)
  if (l && !l.pending) return { label: 'On leave', tone: 'warning', detail: `${l.type} leave` }
  if (js.length) return { label: 'Assigned', tone: 'neutral', detail: `${js.length} job${js.length > 1 ? 's' : ''}` }
  if (l?.pending) return { label: 'Available', tone: 'warning', detail: 'Leave waiting for HR' }
  return { label: 'Available', tone: 'success' }
}

/** What their phone says about that day: timed in, late, timed out, or not timed in. null = nothing to show. */
export function attendanceOf(S: Sched, personId: string, date: string, today: string, now: number): Label | null {
  const log = dayLogOf(S, personId, date), js = jobsOf(S, personId, date)
  if (log) {
    const tin = clock12(manilaClock(log.time_in))
    // needs_review: a selfie or other time-in/out HR or the Coordinator still has to check
    const check = log.status === 'needs_review' ? 'to check' : null
    if (log.time_out) return { label: `Timed out ${clock12(manilaClock(log.time_out))}`, tone: check ? 'warning' : 'neutral', detail: check ?? `Timed in ${tin}` }
    const late = log.late_minutes > 0 ? `${log.late_minutes} min late` : null
    if (late || check) return { label: `Timed in ${tin}`, tone: 'warning', detail: [late, check].filter(Boolean).join(' · ') }
    return { label: `Timed in ${tin}`, tone: 'success' }
  }
  if (onLeave(S, personId, date) || date > today) return null
  if (!js.length) return date === today ? { label: 'Not timed in', tone: 'neutral' } : null
  if (date < today) return { label: 'No time-in', tone: 'danger' }
  const first = Math.min(...js.map((j) => mins(j.start_time)))
  if (now >= first + 15) return { label: 'Not timed in', tone: 'danger', detail: 'late' }
  return { label: 'Not timed in yet', tone: 'neutral', detail: `Starts ${clock12(minsToClock(first))}` }
}

/** Jobs of this person that day that overlap another of their jobs. */
export function clashesOf(S: Sched, personId: string, date: string): Map<string, Job[]> {
  const js = jobsOf(S, personId, date), out = new Map<string, Job[]>()
  for (const a of js) {
    const hit = js.filter((b) => b.id !== a.id && mins(a.start_time) < mins(b.end_time) && mins(b.start_time) < mins(a.end_time))
    if (hit.length) out.set(a.id, hit)
  }
  return out
}

export type NeedAction =
  | { kind: 'call'; label: string; phone: string }
  | { kind: 'edit'; label: string; job: Job }
  | { kind: 'open'; label: string; job: Job }
  | { kind: 'today'; label: string }
export type Need = { key: string; tone: 'danger' | 'warning'; text: string; actions: NeedAction[] }

/** Each problem that day in plain words, with the buttons that fix it. Red first. */
export function needsOf(S: Sched, date: string, today: string, now: number): Need[] {
  const out: Need[] = []
  const first = (n: string) => n.split(' ')[0]
  const phoneOf = (name: string) => S.people.find((p) => p.full_name === name)?.contact_number ?? null
  for (const j of jobsOn(S, date)) {
    const late = atRisk(S, j, date, today, now)
    if (late.length) {
      const lead = j.members.find((m) => m.role === 'lead')
      const leadMissing = !!lead && late.includes(lead.name) && !j.members.some((m) => m.is_acting_lead)
      const calls: NeedAction[] = late.flatMap((n) => { const ph = phoneOf(n); return ph ? [{ kind: 'call' as const, label: `Call ${first(n)}`, phone: ph }] : [] }).slice(0, 2)
      out.push({
        key: `late-${j.id}`, tone: 'danger',
        text: `${join(late.map(first))} ${late.length > 1 ? "haven't" : "hasn't"} timed in for ${j.client_name} (started ${clock12(j.start_time)}).`
          + (leadMissing ? ` ${first(lead!.name)} is the lead.` : ''),
        actions: [...calls, leadMissing ? { kind: 'today', label: 'Pick acting lead' } : { kind: 'edit', label: 'Replace someone', job: j }],
      })
    }
    for (const c of checksOf(S, j, date)) {
      out.push({ key: `check-${j.id}-${c}`, tone: 'warning', text: `${j.client_name}: ${c}`,
        actions: [{ kind: 'edit', label: c.includes('lead') ? 'Change lead' : 'Change crew', job: j }] })
    }
  }
  for (const p of S.people) {
    const clash = clashesOf(S, p.id, date)
    if (!clash.size) continue
    const js = jobsOf(S, p.id, date).filter((j) => clash.has(j.id))
    out.push({ key: `clash-${p.id}`, tone: 'danger', text: `${first(p.full_name)} is on ${js.length} jobs at the same time: ${join(js.map((j) => `${j.client_name} (${clock12(j.start_time)})`))}.`,
      actions: js.slice(0, 2).map((j) => ({ kind: 'edit' as const, label: `Change ${short(j.client_name)}`, job: j })) })
  }
  return out.sort((a, b) => Number(b.tone === 'danger') - Number(a.tone === 'danger'))
}

const minsToClock = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
const join = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
const short = (s: string) => s.length > 16 ? `${s.slice(0, 15)}…` : s
