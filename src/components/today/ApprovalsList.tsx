// ApprovalsList: what's waiting for a decision: selfie time-ins (with the photo), no time-outs, time-outs
// told later, Coordinator time-outs, fake GPS (HR decides), and overtime asks. Decline needs a reason.
'use client'

import { useMemo, useState } from 'react'
import { Camera, Check, ShieldCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { decideOvertime, decideReview } from '@/app/actions/today'
import { formatAgo } from '@/lib/format'
import { Badge, Button, Card, EmptyState, Input, useToast } from '@/components/ui'
import { enrolledFacePath, selfieLink, type OvertimeAsk, type Review } from './todayData'

const KIND: Record<string, { label: string; what: string }> = {
  selfie_time_in: { label: 'Time-in outside the site', what: 'Your time-in with a selfie' },
  fake_gps: { label: 'Fake GPS detected', what: 'Your time-in' },
  no_time_out: { label: 'No time-out', what: 'Your day without a time-out' },
  told_later: { label: 'Time-out told later', what: 'The time-out you reported' },
  coordinator_time_out: { label: 'Timed out by the office', what: 'Your time-out set by the office' },
  driver_away: { label: 'Driver away from HQ', what: 'Your time-out away from the office' },
  early_time_out: { label: 'Timed out early', what: 'Your early time-out' },
  offline_time_in: { label: 'Time-in sent later, place not confirmed', what: 'Your time-in saved with no signal' },
  face_mismatch: { label: 'Face mismatch', what: 'Your time-in selfie' },
}
const when = (iso: string) => new Date(iso).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })

export function ApprovalsList({ reviews, overtime, onChanged }: { reviews: Review[]; overtime: OvertimeAsk[]; onChanged: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [declining, setDeclining] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  if (!reviews.length && !overtime.length) return <EmptyState icon={ShieldCheck} title="Nothing to approve" description="Selfie time-ins, missing time-outs and overtime asks show here." />

  async function review(r: Review, approve: boolean) {
    setBusy(r.id)
    const res = await decideReview(r.id, approve, approve ? '' : note, r.work_day.person_id, KIND[r.kind]?.what ?? 'Your attendance')
    setBusy(null)
    if (!res.ok) return toast.error(res.error)
    toast.success(approve ? 'Approved' : 'Declined'); setDeclining(null); setNote(''); onChanged()
  }
  async function ot(o: OvertimeAsk, approve: boolean) {
    setBusy(o.id)
    const res = await decideOvertime(o.id, approve, o.person_id, o.requested_hours)
    setBusy(null)
    if (!res.ok) return toast.error(res.error)
    toast.success(approve ? 'Overtime approved' : 'Overtime declined'); onChanged()
  }
  async function openSelfie(path: string) {
    const url = await selfieLink(supabase, path)
    if (url) window.open(url, '_blank', 'noopener'); else toast.error("Couldn't open the selfie.")
  }

  return (
    <div className="flex flex-col gap-3">
      {overtime.map((o) => (
        <Card key={o.id} className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-small font-medium text-ink">{o.name} asks for overtime{o.requested_hours >= 8 ? ' (counts until they time out)' : ` (${o.requested_hours} h)`}</p>
            <p className="text-caption text-ink-2">{o.reason}</p>
          </div>
          <Button size="sm" variant="decline" icon={X} disabled={busy === o.id} onClick={() => ot(o, false)}>Decline</Button>
          <Button size="sm" variant="approve" icon={Check} loading={busy === o.id} onClick={() => ot(o, true)}>Approve</Button>
        </Card>
      ))}
      {reviews.map((r) => {
        const k = KIND[r.kind] ?? { label: r.kind, what: 'Your attendance' }
        const d = r.work_day
        return (
          <Card key={r.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={r.kind === 'fake_gps' || r.kind === 'no_time_out' ? 'danger' : 'warning'} dot>{k.label}</Badge>
              <span className="text-small font-medium text-ink">{d.name}</span>
              <span className="text-caption text-ink-3">· {when(d.time_in)} at {d.place_name} · {formatAgo(r.created_at)}</span>
            </div>
            {r.note && <p className="text-small text-ink-2">{r.note}</p>}
            {declining === r.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="min-w-0 flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why not? The person sees this." autoFocus aria-label="Reason for declining" />
                <Button size="sm" variant="ghost" onClick={() => setDeclining(null)}>Back</Button>
                <Button size="sm" variant="danger" loading={busy === r.id} onClick={() => review(r, false)}>Decline</Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {d.selfie_path && <Button size="sm" variant="ghost" icon={Camera} className={r.kind === 'face_mismatch' ? undefined : 'mr-auto'} onClick={() => openSelfie(d.selfie_path!)}>View selfie</Button>}
                {/* Face mismatch: compare the time-in selfie with the face they enrolled */}
                {r.kind === 'face_mismatch' && <Button size="sm" variant="ghost" icon={Camera} className="mr-auto"
                  onClick={async () => { const p = await enrolledFacePath(supabase, d.person_id); if (p) openSelfie(p); else toast.error('No enrolled face yet.') }}>Enrolled face</Button>}
                <Button size="sm" variant="decline" icon={X} onClick={() => { setDeclining(r.id); setNote('') }}>Decline</Button>
                <Button size="sm" variant="approve" icon={Check} loading={busy === r.id} onClick={() => review(r, true)}>Approve</Button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
