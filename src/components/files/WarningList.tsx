// WarningList: one person's disciplinary warnings, newest first, with a button to add one.
'use client'

import { Plus, UserCheck } from 'lucide-react'
import { formatDay } from '@/lib/format'
import { Badge, Button, EmptyState } from '@/components/ui'
import { WARNING_LEVELS, type Warning } from './requirements'

export function WarningList({ warnings, onAdd }: { warnings: Warning[]; onAdd: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-ink-3">Follows the Labor Code twin-notice process: written notice, then a decision.</p>
        <Button size="sm" icon={Plus} onClick={onAdd}>Add warning</Button>
      </div>
      {warnings.length === 0 ? (
        <EmptyState icon={UserCheck} title="No warnings" description="This person has a clean record." />
      ) : (
        <ul className="flex flex-col gap-3">
          {warnings.map((w) => {
            const level = WARNING_LEVELS.find((l) => l.value === w.warning_level)
            return (
              <li key={w.id} className="rounded-control bg-surface-soft p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-small font-medium text-ink">{w.subject}</p>
                  <Badge tone={level?.tone ?? 'neutral'}>{level?.label ?? w.warning_level}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-small text-ink-2">{w.details}</p>
                <p className="mt-2 text-caption text-ink-3">Incident on {formatDay(w.incident_date || w.created_at)}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
