// DocumentChecklist: the six 201 requirements for one person, each marked received or still missing.
'use client'

import { Check, CircleDashed, Undo2 } from 'lucide-react'
import { Button, cx } from '@/components/ui'
import { REQUIREMENTS, fileStatus, type DocKey, type EmployeeFile } from './requirements'

export function DocumentChecklist({
  employee,
  savingKey,
  onToggle,
}: {
  employee: EmployeeFile
  savingKey: DocKey | null
  onToggle: (key: DocKey, received: boolean) => void
}) {
  const s = fileStatus(employee)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-small font-medium text-ink">{s.complete ? 'All documents received' : `${s.missing.length} still missing`}</p>
          <p className="text-caption text-ink-3 tabular-nums">{s.done} of {s.total}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-soft" aria-hidden>
          <div className={cx('h-full rounded-pill', s.complete ? 'bg-success' : 'bg-action')} style={{ width: `${(s.done / s.total) * 100}%` }} />
        </div>
        <p className="mt-2 text-caption text-ink-3">Mark a document once HR has the copy on file.</p>
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {REQUIREMENTS.map((r) => {
          const received = Boolean(employee[r.key])
          return (
            <li key={r.key} className="flex items-center justify-between gap-3 py-3">
              <span className="flex min-w-0 items-start gap-3">
                <span
                  className={cx(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-pill',
                    received ? 'bg-success-soft text-success' : 'bg-surface-soft text-ink-3',
                  )}
                >
                  {received ? <Check className="size-3.5" aria-hidden /> : <CircleDashed className="size-3.5" aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className="block text-small font-medium text-ink">{r.label}</span>
                  <span className="block text-caption text-ink-3">{received ? 'Received' : r.hint}</span>
                </span>
              </span>
              {received ? (
                <Button size="sm" variant="ghost" icon={Undo2} loading={savingKey === r.key} onClick={() => onToggle(r.key, false)}>Undo</Button>
              ) : (
                <Button size="sm" icon={Check} loading={savingKey === r.key} onClick={() => onToggle(r.key, true)}>Mark received</Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
