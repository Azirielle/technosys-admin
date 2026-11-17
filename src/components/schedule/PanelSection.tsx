// PanelSection: one part of the Scheduling side panel ("NEEDS YOU", "TODAY'S AGENDA"): a small uppercase title
// with a count that opens and closes the part, like the reference's side panel.
'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '@/components/ui'

type Props = { title: string; count?: number; countTone?: 'danger'; children: ReactNode }

export function PanelSection({ title, count, countTone, children }: Props) {
  const [open, setOpen] = useState(true)
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-1.5 text-left">
        <ChevronDown className={cx('size-3.5 text-ink-3 transition-transform', !open && '-rotate-90')} aria-hidden />
        <h3 className="flex-1 text-micro font-semibold tracking-wide text-ink-2 uppercase">{title}</h3>
        {typeof count === 'number' && <span className={cx('text-caption tabular-nums', countTone === 'danger' ? 'font-semibold text-danger' : 'text-ink-3')}>{count}</span>}
      </button>
      {open && children}
    </section>
  )
}
