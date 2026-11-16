// PhonesTable: one row per technician/helper: whose phone it is, the phone model, when it was
// registered and last used, and the action HR can take (approve a new phone, or reset).
'use client'

import { Check, RotateCcw, Smartphone, X } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  SkeletonTableRows,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { formatAgo, formatDay } from '@/lib/format'
import { LEVELS, labelOf } from '@/components/files/requirements'
import { phoneState, type WorkPhoneRow } from './phonesActions'

type Props = {
  rows: WorkPhoneRow[]
  loading: boolean
  /** Row id whose action is running */
  busyId: string | null
  onDecide: (row: WorkPhoneRow, approve: boolean) => void
  onReset: (row: WorkPhoneRow) => void
}

function Status({ row }: { row: WorkPhoneRow }) {
  const state = phoneState(row)
  if (state === 'waiting') return <Badge tone="warning" dot>Wants a new phone</Badge>
  if (state === 'registered') return <Badge tone="success" dot>Registered</Badge>
  return <Badge tone="neutral" dot>No phone yet</Badge>
}

export function PhonesTable({ rows, loading, busyId, onDecide, onReset }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyState icon={Smartphone} title="No one matches" description="Try another tab or clear the search." />
  }
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Employee</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Registered phone</TableHeaderCell>
          <TableHeaderCell>Last used</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Action</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && <SkeletonTableRows cols={5} />}
        {!loading &&
          rows.map((row) => {
            const busy = busyId === row.id
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Avatar name={row.full_name} size="sm" />
                    <span>
                      <span className="block font-medium">{row.full_name}</span>
                      <span className="block text-caption text-ink-3">
                        {labelOf(LEVELS, row.technician_level)}{row.contact_number ? ` · ${row.contact_number}` : ''}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell><Status row={row} /></TableCell>
                <TableCell className="text-ink-2">
                  {row.phone ? (
                    <>
                      <span className="block">{row.phone.device_name || 'Phone'}</span>
                      <span className="block text-caption text-ink-3">since {formatDay(row.phone.registered_at)}</span>
                    </>
                  ) : (
                    <span className="text-ink-3">Picks it in the app's first-time setup</span>
                  )}
                  {row.request && (
                    <span className="mt-1 block text-caption text-warning">
                      New: {row.request.device_name || 'a phone'} · asked {formatAgo(row.request.requested_at)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-ink-2 whitespace-nowrap">
                  {row.phone ? formatAgo(row.phone.last_seen_at) : <span className="text-ink-3">—</span>}
                </TableCell>
                <TableCell align="right">
                  <span className="flex justify-end gap-2">
                    {row.request ? (
                      <>
                        <Button size="sm" variant="ghost" icon={X} disabled={busy} onClick={() => onDecide(row, false)}>Decline</Button>
                        <Button size="sm" variant="primary" icon={Check} loading={busy} onClick={() => onDecide(row, true)}>Approve new phone</Button>
                      </>
                    ) : row.phone ? (
                      <Button size="sm" variant="ghost" icon={RotateCcw} disabled={busy} onClick={() => onReset(row)}>Reset phone</Button>
                    ) : null}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
      </TableBody>
    </Table>
  )
}
