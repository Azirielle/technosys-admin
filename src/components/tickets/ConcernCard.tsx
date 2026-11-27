// ConcernCard: the top of a concern in HR's Tickets (Andrew 27 Nov: "not just a text, HR has to judge it"). It shows
// what the technician says (the form's lines), their photo, and for a DTR concern their real record for that day next
// to what they say. HR decides: "Valid, fix the DTR" fixes the day with hr_correct_work_day (late minutes and hours are
// recounted, the change is logged and shows on the phone as "Fixed by HR from DTR concern #…") and resolves the ticket
// with a note; "Not valid" opens the usual close note. Other concerns: Resolve / Not valid. HR can still chat below.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, Field, Input, Textarea, useToast } from '@/components/ui'
import { finishTicket } from './ticketActions'
import { employeeName, kindOf, ticketRef, type Ticket } from './types'

type Day = { id: string; time_in: string; time_out: string | null; late_minutes: number; hours: number | null; status: string; face_check: string | null }

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }) : '—')
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' }) : '')
/** "Label: value" lines the phone wrote (lib/dtr askHrAboutDay, ChatForm, tools) */
const linesOf = (text: string) => text.split('\n').map((l) => l.match(/^([^:]{2,30}):\s*(.+)$/)).filter(Boolean).map((m) => ({ label: m![1], value: m![2] }))

export function ConcernCard({ ticket, onOpenImage, onFinish, onDone }: {
  ticket: Ticket
  onOpenImage: (url: string) => void
  onFinish: (outcome: 'resolved' | 'closed') => void
  onDone: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const name = employeeName(ticket)
  const lines = linesOf(ticket.description ?? '')
  const get = (label: string) => lines.find((l) => l.label === label)?.value ?? ''
  const isDtr = kindOf(ticket) === 'dtr'
  const date = get('Day').match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1] ?? null
  const [day, setDay] = useState<Day | null | undefined>(undefined) // undefined = loading, null = no record that day
  const [fixing, setFixing] = useState(false)
  const [timeIn, setTimeIn] = useState('')
  const [timeOut, setTimeOut] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const finished = ticket.status === 'resolved' || ticket.status === 'closed'

  useEffect(() => {
    if (!isDtr || !date) return
    supabase.from('work_days').select('id, time_in, time_out, late_minutes, hours, status, face_check')
      .eq('person_id', ticket.employee_id).eq('work_date', date).maybeSingle()
      .then(({ data }) => {
        const d = (data as Day | null) ?? null
        setDay(d)
        setTimeIn(get('Correct time in') || hhmm(d?.time_in ?? null))
        setTimeOut(get('Correct time out') || hhmm(d?.time_out ?? null))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, date])

  async function fix() {
    if (!date || !timeIn || !timeOut) return toast.error('Enter the right time in and time out.')
    setSaving(true)
    try {
      const reason = `Fixed by HR from DTR concern ${ticketRef(ticket)}: ${get("What's wrong") || 'DTR concern'}`
      const { data, error } = await supabase.rpc('hr_correct_work_day', {
        p_work_day_id: day?.id ?? null, p_person_id: ticket.employee_id, p_date: date,
        p_time_in: `${date}T${timeIn}:00+08:00`, p_time_out: `${date}T${timeOut}:00+08:00`, p_reason: reason,
      } as never)
      if (error) throw error
      const status = (data as { status?: string } | null)?.status
      if (status !== 'saved') throw new Error(status === 'bad_time' ? 'The time out must be after the time in.' : `The DTR wasn't changed (${status}).`)
      try {
        await finishTicket(supabase, ticket, 'resolved', note.trim() || `Your DTR for ${get('Day').replace(/\s*\(.*\)/, '')} is fixed: time in ${timeIn}, time out ${timeOut}. You'll see it in your DTR.`)
      } catch {
        // The day is already fixed and logged: don't let HR fix it twice
        setFixing(false); onDone()
        return toast.error('The DTR is fixed, but the concern is still open. Press "Mark resolved" to finish it.')
      }
      toast.success('DTR fixed and the concern resolved')
      setFixing(false)
      onDone()
    } catch (err) {
      toast.error(`Couldn't fix the DTR: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-control border border-line bg-surface-soft p-4">
      <p className="text-micro font-medium text-ink-3">{ticket.category} · {ticketRef(ticket)}</p>
      <p className="mt-1 text-small font-semibold text-ink">{isDtr ? `${name} says the DTR for ${get('Day').replace(/\s*\(.*\)/, '') || 'a day'} is wrong` : `${name} reports: ${ticket.title}`}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        {lines.filter((l) => l.label !== 'Day').map((l) => (
          <div key={l.label} className="contents"><dt className="text-ink-3">{l.label}</dt><dd className="whitespace-pre-wrap text-ink">{l.value}</dd></div>
        ))}
        {!lines.length && <div className="contents"><dt className="text-ink-3">Details</dt><dd className="whitespace-pre-wrap text-ink">{ticket.description}</dd></div>}
      </dl>

      {isDtr && date && (
        <div className="mt-3 rounded-control border border-line bg-surface p-3 text-small">
          <p className="text-micro font-medium text-ink-3">What the record says for that day</p>
          {day === undefined ? <p className="mt-1 text-ink-3">Loading…</p> : day === null ? <p className="mt-1 text-ink">No time-in that day.</p> : (
            <p className="mt-1 text-ink">
              In {clock(day.time_in)} · Out {clock(day.time_out)} · {day.late_minutes > 0 ? `${day.late_minutes} min late` : 'not late'} · {day.hours ?? 0} h
              {day.face_check ? ` · face: ${day.face_check.replace(/_/g, ' ')}` : ''}{day.status === 'needs_review' ? ' · waiting for a check' : ''}
            </p>
          )}
        </div>
      )}

      {ticket.attachment_url && (ticket.attachment_type ?? '').startsWith('image/') && (
        <button type="button" onClick={() => onOpenImage(ticket.attachment_url!)} className="mt-3 block" aria-label="Open the photo larger">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ticket.attachment_url} alt={`Photo from ${name}`} className="max-h-48 rounded-control border border-line object-cover" />
        </button>
      )}
      {ticket.attachment_url && !(ticket.attachment_type ?? '').startsWith('image/') && (
        <a href={ticket.attachment_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-small text-link underline">Open the attached file</a>
      )}

      {!finished && (fixing ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Right time in" htmlFor="fix-in"><Input id="fix-in" type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} /></Field>
          <Field label="Right time out" htmlFor="fix-out"><Input id="fix-out" type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label={`Note to ${name} (optional)`} htmlFor="fix-note"><Textarea id="fix-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your DTR is fixed. Thanks for telling us." /></Field>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" variant="primary" icon={Check} loading={saving} onClick={fix}>Fix the DTR and resolve</Button>
            <Button size="sm" variant="ghost" onClick={() => setFixing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {isDtr && date
            ? <Button size="sm" variant="primary" icon={Check} onClick={() => setFixing(true)}>Valid, fix the DTR</Button>
            : <Button size="sm" variant="primary" icon={Check} onClick={() => onFinish('resolved')}>Valid, resolve</Button>}
          <Button size="sm" variant="secondary" icon={X} onClick={() => onFinish('closed')}>Not valid</Button>
        </div>
      ))}
    </div>
  )
}
