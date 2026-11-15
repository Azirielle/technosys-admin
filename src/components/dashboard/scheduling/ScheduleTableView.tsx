// ScheduleTableView: the Scheduling page's table of jobs for the chosen day, week or month.
'use client'

import { CalendarDays } from 'lucide-react'
import {
  EmptyState,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  SkeletonTableRows,
} from '@/components/ui'
import { JobRow } from './JobRow'
import type { HorizonGranularity, ScheduleItem } from './types'

interface ScheduleTableViewProps {
  schedules: ScheduleItem[]
  loading: boolean
  currentPage: number
  itemsPerPage: number
  onPageChange: (p: number) => void
  onQuickReschedule: (s: ScheduleItem) => void
  /** Kept for callers; changing the lead is done from the job panel. */
  onReassign?: (s: ScheduleItem) => void
  onEdit: (s: ScheduleItem) => void
  onCancel: (s: ScheduleItem) => void
  onAssignNow: (s: ScheduleItem) => void
  granularity?: HorizonGranularity
  upcomingCount?: number
  onSwitchToUpcoming?: () => void
}

export default function ScheduleTableView({
  schedules,
  loading,
  currentPage,
  itemsPerPage,
  onPageChange,
  onQuickReschedule,
  onEdit,
  onCancel,
  onAssignNow,
}: ScheduleTableViewProps) {
  const rows = schedules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <TableContainer>
      {!loading && schedules.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No jobs here" description="Nothing matches this date, type or search. Change the filters or add a New job." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Job</TableHeaderCell>
              <TableHeaderCell>Lead and crew</TableHeaderCell>
              <TableHeaderCell>When</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell align="right"><span className="sr-only">Actions</span></TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {loading && (
              <SkeletonTableRows cols={5} />
            )}
            {!loading &&
              rows.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onView={() => onEdit(job)}
                  onReschedule={() => onQuickReschedule(job)}
                  onCancel={() => onCancel(job)}
                  onAssignNow={() => onAssignNow(job)}
                />
              ))}
          </TableBody>
        </Table>
      )}
      {schedules.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(schedules.length / itemsPerPage)}
          totalItems={schedules.length}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          itemNamePlural="jobs"
        />
      )}
    </TableContainer>
  )
}
