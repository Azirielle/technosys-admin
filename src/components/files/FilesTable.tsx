// FilesTable: one row per field worker — position, 201 progress, what's missing, warnings. Click to open the file.
'use client'

import { ArrowRight, FolderOpen } from 'lucide-react'
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
} from '@/components/ui'
import { EMPLOYMENT_STATUS, LEVELS, fileStatus, labelOf, type EmployeeFile } from './requirements'

/** Thin progress bar, e.g. 4 of 6 documents. */
function Progress({ done, total }: { done: number; total: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-pill bg-surface-soft" aria-hidden>
        <span className={`block h-full rounded-pill ${done === total ? 'bg-success' : 'bg-ink-2'}`} style={{ width: `${(done / total) * 100}%` }} />
      </span>
      <span className="text-caption text-ink-2 tabular-nums">{done}/{total}</span>
    </span>
  )
}

export function FilesTable({ employees, loading, onOpen }: { employees: EmployeeFile[]; loading: boolean; onOpen: (emp: EmployeeFile) => void }) {
  if (!loading && employees.length === 0) {
    return <EmptyState icon={FolderOpen} title="No one matches" description="Try another filter or clear the search." />
  }
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Employee</TableHeaderCell>
          <TableHeaderCell>Employment</TableHeaderCell>
          <TableHeaderCell>201 file</TableHeaderCell>
          <TableHeaderCell>Still missing</TableHeaderCell>
          <TableHeaderCell numeric>Warnings</TableHeaderCell>
          <TableHeaderCell align="right"><span className="sr-only">Action</span></TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-ink-3">Loading 201 files…</TableCell>
          </TableRow>
        )}
        {!loading &&
          employees.map((emp) => {
            const s = fileStatus(emp)
            return (
              <TableRow key={emp.id} onClick={() => onOpen(emp)}>
                <TableCell>
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Avatar name={emp.full_name} size="sm" />
                    <span>
                      <span className="block font-medium">{emp.full_name}</span>
                      <span className="block text-caption text-ink-3">{labelOf(LEVELS, emp.technician_level)}</span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-ink-2">{labelOf(EMPLOYMENT_STATUS, emp.employment_status)}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Progress done={s.done} total={s.total} />
                    {s.complete && <Badge tone="success">Complete</Badge>}
                  </span>
                </TableCell>
                <TableCell className="text-ink-2">
                  {s.complete ? <span className="text-ink-3">Nothing</span> : s.missing.map((m) => m.short).join(', ')}
                </TableCell>
                <TableCell numeric>
                  {emp.warnings.length ? <Badge tone="warning">{emp.warnings.length}</Badge> : <span className="text-ink-3">0</span>}
                </TableCell>
                <TableCell align="right">
                  <Button size="sm" variant="ghost" iconRight={ArrowRight}>Open file</Button>
                </TableCell>
              </TableRow>
            )
          })}
      </TableBody>
    </Table>
  )
}
