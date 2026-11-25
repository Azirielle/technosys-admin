// DtrSummaryTable: one row per field worker with their totals for the cut-off. "Open DTR" shows the daily view.
'use client'

import { AlertCircle, ArrowRight, Users } from 'lucide-react'
import type { EmployeeAuditSummary } from '@/app/actions/audit'
import {
  Avatar,
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

/** Number with unit, coloured only when it needs attention; a quiet dash for zero. */
function Num({ value, unit = '', tone }: { value: number; unit?: string; tone?: 'warning' | 'danger' }) {
  if (!value) return <span className="text-ink-3">0</span>
  const colour = tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-ink'
  return <span className={`font-medium ${colour}`}>{value}{unit}</span>
}

export function DtrSummaryTable({
  records,
  loading,
  error,
  onRetry,
  onOpen,
}: {
  records: EmployeeAuditSummary[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onOpen: (employee: EmployeeAuditSummary) => void
}) {
  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load the DTR"
        description={error}
        action={<Button onClick={onRetry}>Try again</Button>}
      />
    )
  }
  if (!loading && records.length === 0) {
    return <EmptyState icon={Users} title="No field staff found" description="Try another cut-off, or clear the search." />
  }

  return (
    <Table>
      <TableHead sticky>
        <tr>
          <TableHeaderCell>Employee</TableHeaderCell>
          <TableHeaderCell numeric>Days worked</TableHeaderCell>
          <TableHeaderCell numeric>Late</TableHeaderCell>
          <TableHeaderCell numeric>Regular OT</TableHeaderCell>
          <TableHeaderCell numeric>Sunday</TableHeaderCell>
          <TableHeaderCell numeric>Regular hol.</TableHeaderCell>
          <TableHeaderCell numeric>Special hol.</TableHeaderCell>
          <TableHeaderCell numeric>Night diff</TableHeaderCell>
          <TableHeaderCell numeric>Absent</TableHeaderCell>
          <TableHeaderCell numeric>Leave</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Action</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && <SkeletonTableRows cols={11} />}
        {!loading &&
          records.map((r) => (
            <TableRow key={r.id} onClick={() => onOpen(r)}>
              <TableCell>
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <Avatar name={r.name} size="sm" />
                  <span>
                    <span className="block font-medium">{r.name}</span>
                    <span className="block text-caption text-ink-3 capitalize">{r.level} · {r.status}</span>
                  </span>
                </span>
              </TableCell>
              <TableCell numeric>
                <span className="font-medium">{r.daysWorked}</span>
                <span className="ml-1 text-caption text-ink-3">({r.totalHours} h)</span>
              </TableCell>
              <TableCell numeric>
                <Num value={r.lateCount} tone="warning" />
                {r.lateCount > 0 && <span className="ml-1 text-caption text-ink-3">({r.totalLateMinutes} min)</span>}
              </TableCell>
              <TableCell numeric><Num value={r.regOtHours} unit=" h" /></TableCell>
              <TableCell numeric><Num value={r.sundayHours} unit=" h" /></TableCell>
              <TableCell numeric><Num value={r.regularHolidayHours} unit=" h" /></TableCell>
              <TableCell numeric><Num value={r.specialHolidayHours} unit=" h" /></TableCell>
              <TableCell numeric><Num value={r.nightDiffHours} unit=" h" /></TableCell>
              <TableCell numeric><Num value={r.absences} tone="danger" /></TableCell>
              <TableCell numeric><Num value={r.approvedLeaves} unit=" d" /></TableCell>
              <TableCell align="right">
                <Button size="sm" variant="ghost" iconRight={ArrowRight}>Open DTR</Button>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  )
}
