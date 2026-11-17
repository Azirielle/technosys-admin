// BorrowingsTable: who has which tool, since when, and whether it's overdue. "Check in" takes it back.
// A tool the borrower reported a problem with (from the phone) shows "Problem reported" with what's wrong.
'use client'

import { Undo2, Wrench } from 'lucide-react'
import { formatDay } from '@/lib/format'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  SkeletonTableRows,
} from '@/components/ui'
import { BORROW_STATUS, CONDITIONS, daysOut, isOverdue, type Borrowing } from './types'

export function BorrowingsTable({
  borrowings,
  loading,
  emptyText,
  onOpen,
  onReturn,
  reports,
}: {
  borrowings: Borrowing[]
  loading: boolean
  emptyText: string
  onOpen: (b: Borrowing) => void
  onReturn: (b: Borrowing) => void
  reports: Map<string, string>
}) {
  if (!loading && borrowings.length === 0) {
    return <EmptyState icon={Wrench} title="Nothing here" description={emptyText} />
  }
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Tool</TableHeaderCell>
          <TableHeaderCell>Borrowed by</TableHeaderCell>
          <TableHeaderCell>Since</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Action</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && (
          <SkeletonTableRows cols={5} />
        )}
        {!loading &&
          borrowings.map((b) => {
            const status = BORROW_STATUS[b.status]
            const days = daysOut(b)
            const condition = CONDITIONS.find((c) => c.value === b.condition_on_return)
            return (
              <TableRow key={b.id} onClick={() => onOpen(b)}>
                <TableCell>
                  <span className="block font-medium">
                    {b.quantity > 1 && <span className="tabular-nums">{b.quantity} × </span>}
                    {b.tool_catalog?.name || 'Tool'}
                  </span>
                  {b.tool_catalog?.serial_number && <span className="block font-mono text-caption text-ink-3">{b.tool_catalog.serial_number}</span>}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Avatar name={b.profiles?.full_name || 'Staff'} size="xs" />
                    {b.profiles?.full_name || 'Staff'}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDay(b.handed_over_at)}
                  <span className="ml-1.5 text-caption text-ink-3">({days} {days === 1 ? 'day' : 'days'})</span>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {isOverdue(b) ? <Badge tone="danger" dot>Overdue</Badge> : <Badge tone={status.tone} dot>{status.label}</Badge>}
                    {condition && b.status === 'returned' && condition.value !== 'good' && <Badge>{condition.label}</Badge>}
                    {b.status === 'checked_out' && reports.has(`${b.technician_id}|${b.tool_catalog?.name}`) && (
                      <Badge tone="warning" title={reports.get(`${b.technician_id}|${b.tool_catalog?.name}`)}>Problem reported: {reports.get(`${b.technician_id}|${b.tool_catalog?.name}`)}</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell align="right">
                  {b.status === 'checked_out' && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" icon={Undo2} onClick={() => onReturn(b)}>Check in</Button>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
      </TableBody>
    </Table>
  )
}
