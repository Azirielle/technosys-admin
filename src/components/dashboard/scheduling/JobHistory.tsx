// JobHistory: every change to one job (created, moved, lead changed, cancelled…), newest first.
'use client'

import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { getScheduleChangeLogs } from '@/app/actions/schedules'
import { formatDay, formatTime } from '@/lib/format'
import { EmptyState, Skeleton, SkeletonArea } from '@/components/ui'
import type { ScheduleChangeLogItem } from './types'

const ACTION: Record<ScheduleChangeLogItem['action_type'], string> = {
  created: 'Job created',
  rescheduled: 'Moved to another time',
  reassigned: 'Lead changed',
  crew_added: 'Crew added',
  crew_released: 'Crew released',
  cancelled: 'Cancelled',
  details_updated: 'Details changed',
}

export function JobHistory({ jobId, onCount }: { jobId: string; onCount?: (n: number) => void }) {
  const [logs, setLogs] = useState<ScheduleChangeLogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getScheduleChangeLogs(jobId)
      .then((res) => {
        const list = (res?.data ?? []) as ScheduleChangeLogItem[]
        setLogs(list)
        onCount?.(list.length)
      })
      .finally(() => setLoading(false))
  }, [jobId, onCount])

  if (loading)
    return (
      <SkeletonArea label="Loading history" className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-16 w-full rounded-control" />)}
      </SkeletonArea>
    )
  if (logs.length === 0) return <EmptyState icon={History} title="No changes yet" description="Moves, crew changes and cancellations are listed here." />

  return (
    <ol className="flex flex-col gap-2">
      {logs.map((l) => (
        <li key={l.id} className="rounded-control bg-surface-soft p-3">
          <p className="flex justify-between gap-2 text-caption">
            <span className="font-medium text-ink">{ACTION[l.action_type] ?? l.action_type}</span>
            <span className="text-ink-3">{formatDay(l.created_at)}, {formatTime(l.created_at)}</span>
          </p>
          {l.reason && <p className="mt-1 text-small text-ink-2">{l.reason}</p>}
          {l.profiles?.full_name && <p className="mt-1 text-caption text-ink-3">By {l.profiles.full_name}</p>}
        </li>
      ))}
    </ol>
  )
}
