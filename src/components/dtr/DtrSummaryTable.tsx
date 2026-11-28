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

// 11 number columns: titles may wrap and padding is tighter, so the table fits the page without a sideways scrollbar.
const HEAD = 'whitespace-normal px-2.5 leading-tight'
const CELL = 'px-2.5'

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
          <TableHeaderCell numeric className={HEAD}>Days worked</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Late</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Regular OT</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Sunday</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Regular hol.</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Special hol.</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Night diff</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Sick leave</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Vacation leave</TableHeaderCell>
          <TableHeaderCell numeric className={HEAD}>Absent (no credits)</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Action</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && <SkeletonTableRows cols={12} />}
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
              <TableCell numeric className={CELL}>
                <span className="font-medium">{r.daysWorked}</span>
                <span className="ml-1 text-caption text-ink-3">({r.totalHours} h)</span>
              </TableCell>
              <TableCell numeric className={CELL}>
                <Num value={r.lateCount} tone="warning" />
                {r.lateCount > 0 && <span className="ml-1 text-caption text-ink-3">({r.totalLateMinutes} min)</span>}
              </TableCell>
              <TableCell numeric className={CELL}><Num value={r.regOtHours} unit=" h" /></TableCell>
              <TableCell numeric className={CELL}><Num value={r.sundayHours} unit=" h" /></TableCell>
              <TableCell numeric className={CELL}><Num value={r.regularHolidayHours} unit=" h" /></TableCell>
              <TableCell numeric className={CELL}><Num value={r.specialHolidayHours} unit=" h" /></TableCell>
              <TableCell numeric className={CELL}><Num value={r.nightDiffHours} unit=" h" /></TableCell>
              <TableCell numeric className={CELL}><Num value={r.sickLeaveDays} unit=" d" /></TableCell>
              <TableCell numeric className={CELL}><Num value={r.vacationLeaveDays} unit=" d" /></TableCell>
              <TableCell numeric className={CELL}><Num value={r.salaryDeductionDays} tone="danger" unit=" d" /></TableCell>
              <TableCell align="right">
                <Button size="sm" variant="ghost" iconRight={ArrowRight}>Open DTR</Button>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  )
}
