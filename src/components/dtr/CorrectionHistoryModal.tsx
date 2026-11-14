// CorrectionHistoryModal: every change made to one person's punch on one day — who, when, before, after, why.
'use client'

import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { getTimeLogCorrectionHistory, type CorrectionHistoryRecord } from '@/app/actions/audit-corrections'
import { formatDay, formatTime } from '@/lib/format'
import { Button, EmptyState, Modal } from '@/components/ui'

export interface HistoryTarget {
  employeeId: string
  employeeName: string
  date: string
}

function shift(timeIn: string | null, timeOut: string | null) {
  if (!timeIn) return 'No punch'
  return `${formatTime(timeIn)} → ${timeOut ? formatTime(timeOut) : 'no time out'}`
}

export function CorrectionHistoryModal({ target, onClose }: { target: HistoryTarget | null; onClose: () => void }) {
  const [records, setRecords] = useState<CorrectionHistoryRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!target) return
    setLoading(true)
    getTimeLogCorrectionHistory(target.employeeId, target.date, target.date)
      .then((res) => setRecords(res.success ? res.records : []))
      .finally(() => setLoading(false))
  }, [target])

  if (!target) return null
  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={History}
      title="Correction history"
      subtitle={`${target.employeeName} · ${formatDay(target.date)}`}
      maxWidth="md"
      contentHeight="max-h-[80vh]"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {loading ? (
        <p className="py-8 text-center text-small text-ink-3">Loading history…</p>
      ) : records.length === 0 ? (
        <EmptyState icon={History} title="No corrections" description="This day hasn't been changed." />
      ) : (
        <ol className="flex flex-col gap-3">
          {records.map((h) => (
            <li key={h.id} className="rounded-control bg-surface-soft p-3">
              <p className="flex justify-between gap-2 text-caption">
                <span className="font-medium text-ink">{h.actor_name || 'Office staff'} ({h.actor_role})</span>
                <span className="text-ink-3">{formatDay(h.created_at)}, {formatTime(h.created_at)}</span>
              </p>
              <p className="mt-2 text-caption text-ink-2">Before: {shift(h.original_time_in, h.original_time_out)}</p>
              <p className="text-caption font-medium text-ink">After: {shift(h.corrected_time_in, h.corrected_time_out)}</p>
              <p className="mt-2 text-small text-ink-2">“{h.reason}”</p>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}
