// QuickRescheduleDrawer: one job in a side panel — summary, then Move / Edit details / History, plus change lead or cancel.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapPin, UserRoundCog, X } from 'lucide-react'
import { Avatar, Badge, Button, Drawer, Tabs } from '@/components/ui'
import { dayOf, jobStatus, jobType, timeOf } from './jobLabels'
import { JobRescheduleForm } from './JobRescheduleForm'
import { JobDetailsForm } from './JobDetailsForm'
import { JobHistory } from './JobHistory'
import type { ScheduleItem } from './types'

type View = 'reschedule' | 'edit_details' | 'history'

interface QuickRescheduleDrawerProps {
  isOpen: boolean
  onClose: () => void
  schedule: ScheduleItem | null
  allSchedules: ScheduleItem[]
  initialTab?: View
  onSuccess: (targetDate?: string) => void
  onReassign?: (s: ScheduleItem) => void
  onCancel?: (s: ScheduleItem) => void
}

export default function QuickRescheduleDrawer({ isOpen, onClose, schedule, allSchedules, initialTab = 'reschedule', onSuccess, onReassign, onCancel }: QuickRescheduleDrawerProps) {
  const [view, setView] = useState<View>(initialTab)
  const [changes, setChanges] = useState<number | undefined>(undefined)
  const onCount = useCallback((n: number) => setChanges(n), [])

  useEffect(() => {
    if (isOpen) {
      setView(initialTab)
      setChanges(undefined)
    }
  }, [isOpen, initialTab, schedule?.id])

  if (!isOpen || !schedule) return null
  const job = schedule
  const type = jobType(job)
  const status = jobStatus(job)
  const cancelled = job.status === 'cancelled'

  return (
    <Drawer
      isOpen
      onClose={onClose}
      width="lg"
      title={job.project_name || job.client_name}
      subtitle={`${type.label} · ${dayOf(job.start_time)}, ${timeOf(job.start_time)}–${timeOf(job.end_time)}`}
      headerExtra={<Badge tone={status.tone} dot>{status.label}</Badge>}
      footer={
        !cancelled && (
          <>
            {onReassign && <Button variant="ghost" icon={UserRoundCog} onClick={() => onReassign(job)}>Change lead</Button>}
            {onCancel && <Button variant="ghost" icon={X} className="text-danger hover:text-danger" onClick={() => onCancel(job)}>Cancel job</Button>}
          </>
        )
      }
    >
      <div className="flex flex-col gap-section">
        <div className="flex items-center gap-3 rounded-control bg-surface-soft p-3">
          <Avatar name={job.profiles?.full_name || '?'} />
          <div className="min-w-0 text-small">
            <p className="font-medium text-ink">{job.profiles?.full_name || 'No lead yet'}</p>
            <p className="flex items-center gap-1 truncate text-caption text-ink-3">
              <MapPin className="size-3 shrink-0" aria-hidden /> {job.location || 'Pacita HQ'}
            </p>
          </div>
        </div>
        {job.cancellation_reason && <p className="rounded-control bg-danger-soft p-3 text-small text-danger">Cancelled: {job.cancellation_reason}</p>}

        <Tabs
          label="Job section"
          value={cancelled ? 'history' : view}
          onChange={setView}
          items={[
            ...(cancelled ? [] : [{ value: 'reschedule' as const, label: 'Move' }, { value: 'edit_details' as const, label: 'Edit details' }]),
            { value: 'history' as const, label: 'History', count: changes },
          ]}
        />
        {!cancelled && view === 'reschedule' && <JobRescheduleForm job={job} allJobs={allSchedules} onDone={(d) => { onSuccess(d); onClose() }} />}
        {!cancelled && view === 'edit_details' && <JobDetailsForm job={job} onDone={() => { onSuccess(); onClose() }} />}
        {(cancelled || view === 'history') && <JobHistory jobId={job.id} onCount={onCount} />}
      </div>
    </Drawer>
  )
}
