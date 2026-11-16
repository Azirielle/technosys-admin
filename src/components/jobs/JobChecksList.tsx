// JobChecksList: what the database's save checks found for the people and vehicle picked. Red rows block
// saving (on leave, already booked, vehicle busy); yellow rows are warnings (pending leave, no phone yet).
'use client'

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { SaveCheck } from './jobTypes'

export function JobChecksList({ checks, checking, extra }: { checks: SaveCheck[] | null; checking: boolean; extra: string[] }) {
  if (checking) {
    return <p className="flex items-center gap-2 text-small text-ink-3"><Loader2 className="size-4 animate-spin" aria-hidden /> Checking the crew…</p>
  }
  const rows = [...(checks ?? []), ...extra.map((detail) => ({ blocking: false, detail, kind: 'form', person_id: null, vehicle_id: null }))]
  if (checks && rows.length === 0) {
    return <p className="flex items-center gap-2 text-small text-success"><CheckCircle2 className="size-4" aria-hidden /> No clashes. Everyone is free.</p>
  }
  return (
    <ul className="flex flex-col gap-2" aria-live="polite">
      {rows.sort((a, b) => Number(b.blocking) - Number(a.blocking)).map((c, i) => (
        <li key={i} className={`flex items-start gap-2 rounded-control px-3 py-2 text-small ${c.blocking ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}>
          {c.blocking ? <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span>{c.detail}</span>
        </li>
      ))}
    </ul>
  )
}
