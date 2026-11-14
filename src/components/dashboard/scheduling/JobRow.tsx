// JobRow: one job in the Scheduling table — what and where, who, when, status, and actions.
'use client'

import { Clock, MapPin, UserPlus, Users } from 'lucide-react'
import { Avatar, Badge, Button, TableCell, TableRow, cx } from '@/components/ui'
import { dayOf, hasNoLead, jobStatus, jobType, timeOf } from './jobLabels'
import type { ScheduleItem } from './types'

export function JobRow({
  job,
  onView,
  onReschedule,
  onCancel,
  onAssignNow,
}: {
  job: ScheduleItem
  onView: () => void
  onReschedule: () => void
  onCancel: () => void
  onAssignNow: () => void
}) {
  const type = jobType(job)
  const TypeIcon = type.icon
  const status = jobStatus(job)
  const noLead = hasNoLead(job)
  const cancelled = job.status === 'cancelled'
  const crew = job.schedule_crew_assignments?.filter((c) => c.status === 'active').length ?? 0
  const helpers = job.schedule_casual_helpers?.length ?? 0

  return (
    <TableRow className={cx(cancelled && 'opacity-60')}>
      <TableCell>
        <span className="flex items-center gap-1.5 text-caption text-ink-3">
          <TypeIcon className="size-3.5" aria-hidden /> {type.label}
        </span>
        <span className={cx('block font-medium', cancelled && 'line-through')}>{job.project_name || job.client_name}</span>
        <span className="flex items-center gap-1 text-caption text-ink-3">
          <MapPin className="size-3" aria-hidden /> {job.location || 'Pacita HQ'}
        </span>
        {job.cancellation_reason && <span className="block text-caption text-danger">Cancelled: {job.cancellation_reason}</span>}
      </TableCell>

      <TableCell>
        {noLead ? (
          <Button size="sm" icon={UserPlus} onClick={onAssignNow} disabled={cancelled}>Assign a lead</Button>
        ) : (
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <Avatar name={job.profiles?.full_name || 'Staff'} size="sm" />
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                {job.profiles?.full_name || 'Staff'}
                {job.profiles?.technician_level === 'senior' && <Badge>Senior</Badge>}
              </span>
              <span className="flex items-center gap-1 text-caption text-ink-3">
                <Users className="size-3" aria-hidden />
                {crew > 1 ? `${crew} in crew` : 'Working alone'}
                {helpers > 0 && ` · +${helpers} temporary`}
              </span>
            </span>
          </span>
        )}
      </TableCell>

      <TableCell className="whitespace-nowrap">
        {job.assignment_type === 'deployment' ? (
          <>
            <span className="block font-medium">From {dayOf(job.start_time)}</span>
            <span className="block text-caption text-ink-3">{job.target_review_date ? `Check-in ${dayOf(job.target_review_date)}` : 'Ongoing'}</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="size-3.5 text-ink-3" aria-hidden /> {timeOf(job.start_time)}–{timeOf(job.end_time)}
            </span>
            <span className="block text-caption text-ink-3">
              {dayOf(job.start_time)} · {job.assignment_type === 'office_duty' ? 'At Pacita HQ' : job.reporting_instruction === 'via_pacita_hq' ? 'Meet at HQ first' : 'Straight to site'}
            </span>
          </>
        )}
      </TableCell>

      <TableCell><Badge tone={status.tone} dot>{status.label}</Badge></TableCell>

      <TableCell align="right">
        <span className="flex justify-end gap-1">
          <Button size="sm" onClick={onView}>View</Button>
          {!cancelled && (
            <>
              <Button size="sm" variant="ghost" onClick={onReschedule}>Reschedule</Button>
              <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={onCancel}>Cancel</Button>
            </>
          )}
        </span>
      </TableCell>
    </TableRow>
  )
}
