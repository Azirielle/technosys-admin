// TemporaryWorkerPicker: tick the temporary (per-job) workers to add to a crew, or add a new one.
'use client'

import { Plus } from 'lucide-react'
import { Button, Checkbox } from '@/components/ui'
import type { CasualHelperItem } from './types'

export function TemporaryWorkerPicker({
  helpers,
  selected,
  onChange,
  onAddNew,
}: {
  helpers: CasualHelperItem[]
  selected: string[]
  onChange: (ids: string[]) => void
  onAddNew: () => void
}) {
  const active = helpers.filter((h) => (h.status || 'active') === 'active')
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-small font-medium text-ink">Temporary workers</h3>
          <p className="text-caption text-ink-3">Helpers hired for this job who don&apos;t use the app.</p>
        </div>
        <Button size="sm" variant="ghost" icon={Plus} onClick={onAddNew}>Add new</Button>
      </div>
      {active.length === 0 ? (
        <p className="rounded-control bg-surface-soft p-3 text-small text-ink-3">No temporary workers yet.</p>
      ) : (
        <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-control bg-surface-soft p-3">
          {active.map((h) => (
            <Checkbox
              key={h.id}
              checked={selected.includes(h.id)}
              onChange={(e) => onChange(e.target.checked ? [...selected, h.id] : selected.filter((id) => id !== h.id))}
              label={h.full_name}
              hint={h.contact_number}
            />
          ))}
        </div>
      )}
    </section>
  )
}
