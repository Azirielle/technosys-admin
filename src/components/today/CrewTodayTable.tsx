// CrewTodayTable: one row per person on today's jobs (and office duty): the job, their status in plain words,
// time in (late minutes, outside with a selfie), time out, and "Time out…" for anyone still in.
'use client'

import { Clock, Users } from 'lucide-react'
import { Avatar, Badge, Button, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { clock } from '@/components/jobs/jobTypes'
import { STATE_LABEL, type Row } from './todayStatus'

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })
const ROLE: Record<string, string> = { lead: 'Lead', crew: 'Crew', driver: 'Driver', helper: 'Helper', office: 'Office duty' }

export function CrewTodayTable({ rows, onTimeOut }: { rows: Row[]; onTimeOut: (row: Row) => void }) {
  if (rows.length === 0) return <EmptyState icon={Users} title="Nobody is scheduled today" description="Jobs you schedule for today show their crew here." />
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Person</TableHeaderCell>
          <TableHeaderCell>Job</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Time in</TableHeaderCell>
          <TableHeaderCell>Time out</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Action</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((r) => {
          const s = STATE_LABEL[r.state]
          const d = r.day
          return (
            <TableRow key={`${r.person_id}-${r.job?.id ?? 'office'}`}>
              <TableCell>
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <Avatar name={r.name} size="sm" />
                  <span>
                    <span className="block font-medium">{r.name}</span>
                    <span className="block text-caption text-ink-3">{r.is_acting_lead ? 'Acting lead' : ROLE[r.role] ?? r.role}</span>
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-ink-2">
                {r.job ? (
                  <>
                    <span className="block">{r.job.client_name}</span>
                    <span className="block text-caption text-ink-3">{clock(r.job.start_time)} · {r.job.report_to === 'hq' ? 'office first' : 'at the site'}</span>
                  </>
                ) : <span className="text-ink-3">{d?.place_name ?? '—'}</span>}
              </TableCell>
              <TableCell><Badge tone={s.tone} dot>{s.label}</Badge></TableCell>
              <TableCell className="whitespace-nowrap text-ink-2">
                {d ? (
                  <>
                    <span className="block">{hhmm(d.time_in)}{d.late_minutes > 0 && <span className="text-warning"> · {d.late_minutes} min late</span>}</span>
                    {d.in_check === 'selfie' && <span className="block text-caption text-warning">Outside, selfie: {d.in_reason}</span>}
                    {d.in_check === 'queued' && <span className="block text-caption text-ink-3">Sent later (no signal)</span>}
                  </>
                ) : <span className="text-ink-3">—</span>}
              </TableCell>
              <TableCell className="whitespace-nowrap text-ink-2">
                {d?.time_out ? <>{hhmm(d.time_out)} <span className="text-ink-3">· {d.hours ?? 0} h</span></> : <span className="text-ink-3">—</span>}
              </TableCell>
              <TableCell align="right">
                {d && !d.time_out && <Button size="sm" variant="ghost" icon={Clock} onClick={() => onTimeOut(r)}>Time out…</Button>}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
