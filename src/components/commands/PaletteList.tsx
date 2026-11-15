// PaletteList: the results in Quick actions, in groups (Do, Go to, People and records, Settings).
'use client'

import type { LucideIcon } from 'lucide-react'
import { CornerDownLeft } from 'lucide-react'
import { Skeleton, cx } from '@/components/ui'
import { Keys } from './Keys'

export type PaletteItem = {
  id: string
  group: string
  title: string
  hint: string
  icon: LucideIcon
  keys?: string[]
  run: () => void
}

export function PaletteList({
  items,
  index,
  searching,
  query,
  onHover,
}: {
  items: PaletteItem[]
  index: number
  /** Still looking up people and records. */
  searching: boolean
  query: string
  onHover: (i: number) => void
}) {
  return (
    <ul role="listbox" aria-label="Results" className="max-h-[55vh] overflow-y-auto p-2">
      {items.length === 0 && !searching && (
        <li className="px-3 py-8 text-center text-small text-ink-3">Nothing matches “{query}”.</li>
      )}
      {items.map((item, i) => {
        const Icon = item.icon
        const active = i === index
        const firstOfGroup = i === 0 || items[i - 1].group !== item.group
        return (
          <li key={item.id} role="option" aria-selected={active}>
            {firstOfGroup && <p className="px-3 pt-3 pb-1 text-micro font-medium text-ink-3">{item.group}</p>}
            <button
              type="button"
              onMouseEnter={() => onHover(i)}
              onClick={item.run}
              className={cx('flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-left', active && 'bg-surface-soft')}
            >
              <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-pill', active ? 'bg-action text-on-action' : 'bg-surface-soft text-ink-2')}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-medium text-ink">{item.title}</span>
                <span className="block truncate text-caption text-ink-3">{item.hint}</span>
              </span>
              {item.keys && <Keys keys={item.keys} />}
              {active && <CornerDownLeft className="size-4 shrink-0 text-ink-3" aria-hidden />}
            </button>
          </li>
        )
      })}
      {searching && (
        <li className="flex flex-col gap-2 px-3 py-3" aria-label="Looking up people and records">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full rounded-control" />
          <Skeleton className="h-9 w-full rounded-control" />
        </li>
      )}
    </ul>
  )
}
