// EmployeeDtrModal: one person's DTR for the cut-off, day by day, with Correct / History per day.
'use client'

import { History, Pencil, Plus } from 'lucide-react'
import type { DailyAuditRecord, EmployeeAuditSummary } from '@/app/actions/audit'
import { formatDay } from '@/lib/format'
import {
  Badge,
  Button,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { DayStatus } from './DayStatus'
import type { Cutoff } from './cutoffs'

/** Shows a number with its unit, or a quiet dash for zero. */
function Amount({ value, unit, tone }: { value: number; unit: string; tone?: 'warning' }) {
  if (!value) return <span className="text-ink-3">–</span>
  return <span className={tone === 'warning' ? 'text-warning' : undefined}>{value}{unit}</span>
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control bg-surface-soft px-3 py-2">
      <p className="text-micro text-ink-3">{label}</p>
      <p className="text-small font-semibold text-ink tabular-nums">{value}</p>
    </div>
  )
}

export function EmployeeDtrModal({
  employee,
  cutoff,
  onClose,
  onCorrect,
  onHistory,
}: {
  employee: EmployeeAuditSummary | null
  cutoff: Cutoff
  onClose: () => void
  onCorrect: (day: DailyAuditRecord) => void
  onHistory: (day: DailyAuditRecord) => void
}) {
  if (!employee) return null
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={employee.name}
      subtitle={`${employee.level} · ${employee.status} · ${cutoff.label}`}
      maxWidth="5xl"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <Summary label="Days worked" value={`${employee.daysWorked} (${employee.totalHours} h)`} />
          <Summary label="Late" value={employee.lateCount ? `${employee.lateCount}× · ${employee.totalLateMinutes} min` : 'None'} />
          <Summary label="Regular OT" value={`${employee.regOtHours} h`} />
          <Summary label="Sunday · reg. · spec." value={`${employee.sundayHours} · ${employee.regularHolidayHours} · ${employee.specialHolidayHours} h`} />
          <Summary label="Night diff" value={`${employee.nightDiffHours} h`} />
          <Summary label="Sick leave" value={`${employee.sickLeaveDays} d`} />
          <Summary label="Vacation leave" value={`${employee.vacationLeaveDays} d`} />
          <Summary label="Salary deduction" value={`${employee.salaryDeductionDays} d`} />
          {(employee.otherLeaveDays ?? 0) > 0 && (
            <Summary label="Other leave" value={`${employee.otherLeaveDays} d`} />
          )}
        </div>

        <TableContainer className="shadow-none ring-1 ring-line">
          <Table>
            <TableHead sticky>
              <tr>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Schedule</TableHeaderCell>
                <TableHeaderCell>Time in → out</TableHeaderCell>
                <TableHeaderCell numeric>Hours</TableHeaderCell>
                <TableHeaderCell numeric>Late</TableHeaderCell>
                <TableHeaderCell numeric>OT</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell align="right"><span className="sr-only">Actions</span></TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {employee.dailyBreakdown.map((day) => (
                <TableRow key={day.date}>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-medium">{formatDay(day.date)}</span>
                    <span className={day.isSunday ? 'ml-1.5 text-danger' : 'ml-1.5 text-ink-3'}>{day.dayOfWeek}</span>
                  </TableCell>
                  <TableCell className="text-ink-2">
                    {day.scheduledStart ? (
                      <span className="whitespace-nowrap">
                        {day.scheduledStart}–{day.scheduledEnd || '17:00'}
                        {day.scheduleClient && <span className="block max-w-40 truncate text-caption text-ink-3" title={day.scheduleClient}>{day.scheduleClient}</span>}
                      </span>
                    ) : (
                      <span className="text-ink-3">–</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-caption whitespace-nowrap">
                    {day.actualTimeIn ? `${day.actualTimeIn} → ${day.actualTimeOut || 'no time out'}` : <span className="text-ink-3">–</span>}
                  </TableCell>
                  <TableCell numeric><Amount value={day.hoursWorked} unit=" h" /></TableCell>
                  <TableCell numeric><Amount value={day.lateMinutes} unit=" min" tone="warning" /></TableCell>
                  <TableCell numeric><Amount value={day.regOtHours + day.sunHolidayOtHours} unit=" h" /></TableCell>
                  <TableCell><DayStatus day={day} /></TableCell>
                  <TableCell align="right">
                    <span className="flex justify-end gap-1">
                      {day.isCorrected && (
                        <Button size="sm" variant="ghost" icon={History} onClick={() => onHistory(day)}>History</Button>
                      )}
                      <Button size="sm" variant="ghost" icon={day.actualTimeIn ? Pencil : Plus} onClick={() => onCorrect(day)}>
                        {day.actualTimeIn ? 'Correct' : 'Add shift'}
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {employee.dailyBreakdown.some((d) => d.isMocked || d.isSuspicious) && (
          <p className="text-caption text-ink-2">
            <Badge tone="danger">Fake GPS</Badge> and <Badge tone="warning">Check punch</Badge> days need HR to confirm the punch with the coordinator before the DTR is final.
          </p>
        )}
      </div>
    </Modal>
  )
}
