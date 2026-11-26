// ToolRequestsTable: tools technicians asked for from the phone. Lend (opens the usual lend window with the person and
// the number filled in) or Decline with a reason; either way the technician gets the answer in their Techy chat.
'use client'

import { useState } from 'react'
import { Check, Inbox, X } from 'lucide-react'
import { formatDay } from '@/lib/format'
import { formatTimeAgo } from '@/lib/hr-status'
import { Button, EmptyState, Input, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import type { ToolRequest } from './toolRequests'

type Props = { requests: ToolRequest[]; onLend: (r: ToolRequest) => void; onDecline: (r: ToolRequest, reason: string) => Promise<void> }

export function ToolRequestsTable({ requests, onLend, onDecline }: Props) {
  const [declining, setDeclining] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  if (!requests.length) return <EmptyState icon={Inbox} title="No tool requests" description="Requests technicians send from the app show here." />
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Who</TableHeaderCell>
          <TableHeaderCell>Tool</TableHeaderCell>
          <TableHeaderCell>Needed on</TableHeaderCell>
          <TableHeaderCell>Why</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Decide</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id}>
            <TableCell><span className="block font-medium">{r.person}</span><span className="text-caption text-ink-3">{formatTimeAgo(r.created_at)}</span></TableCell>
            <TableCell>{r.howMany} × {r.tool}{r.delivery === 'driver' && <span className="block text-caption text-ink-3">Driver delivers</span>}</TableCell>
            <TableCell className="whitespace-nowrap text-ink-2">{r.neededOn ? formatDay(r.neededOn) : '—'}</TableCell>
            <TableCell className="max-w-xs text-ink-2">{r.why ?? '—'}</TableCell>
            <TableCell align="right">
              {declining === r.id ? (
                <span className="flex items-center justify-end gap-2">
                  <Input className="w-56" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why not? They see this." aria-label="Reason for declining" autoFocus />
                  <Button size="sm" variant="decline" loading={busy} disabled={reason.trim().length < 3}
                    onClick={async () => { setBusy(true); await onDecline(r, reason); setBusy(false); setDeclining(null) }}>Decline</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeclining(null)}>Cancel</Button>
                </span>
              ) : (
                <span className="flex justify-end gap-2">
                  <Button size="sm" variant="decline" icon={X} onClick={() => { setDeclining(r.id); setReason('') }}>Decline</Button>
                  <Button size="sm" variant="approve" icon={Check} onClick={() => onLend(r)}>Lend</Button>
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
