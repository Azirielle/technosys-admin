// Tabs: a pill switcher for views or filters on one page ("All · Pending · Approved").
'use client'
import type { ReactNode } from 'react'
import { cx } from './cx'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  /** Optional number after the label, e.g. how many are pending. */
  count?: number
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  size = 'md',
  label,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  /** Read out by screen readers, e.g. "Leave status". */
  label?: string
  className?: string
}) {
  return (
    <div role="tablist" aria-label={label} className={cx('inline-flex max-w-full shrink-0 gap-0.5 overflow-x-auto rounded-pill bg-surface-soft p-1', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-pill font-medium whitespace-nowrap transition-colors cursor-pointer',
              'focus-visible:outline-2 focus-visible:outline-focus',
              size === 'sm' ? 'h-7 px-3 text-caption' : 'h-8 px-3.5 text-small',
              active ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span className={cx('tabular-nums', active ? 'text-ink-2' : 'text-ink-3')}>{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
