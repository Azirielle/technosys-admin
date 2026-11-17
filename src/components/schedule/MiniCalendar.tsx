// MiniCalendar: the month beside the board. A dot marks days with jobs; click a day to show it on the board.
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton, cx } from '@/components/ui'

type Props = { value: string; today: string; busyDays: Set<string>; onPick: (ymd: string) => void }

export function MiniCalendar({ value, today, busyDays, onPick }: Props) {
  // The month shown follows the picked day, and the arrows can page away from it
  const [offset, setOffset] = useState(0)
  const [pickedMonth, setPickedMonth] = useState(value.slice(0, 7))
  if (pickedMonth !== value.slice(0, 7)) { setPickedMonth(value.slice(0, 7)); setOffset(0) }

  const base = new Date(`${value.slice(0, 7)}-01T00:00:00Z`)
  base.setUTCMonth(base.getUTCMonth() + offset)
  const y = base.getUTCFullYear(), m = base.getUTCMonth()
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay()
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const ymd = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const title = base.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-small font-semibold text-ink">{title}</h3>
        <span className="flex gap-1">
          <IconButton icon={ChevronLeft} label="Previous month" size="sm" onClick={() => setOffset(offset - 1)} />
          <IconButton icon={ChevronRight} label="Next month" size="sm" onClick={() => setOffset(offset + 1)} />
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-caption">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="py-1 text-micro text-ink-3">{d}</span>)}
        {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = ymd(i + 1), picked = d === value
          return (
            <button key={d} type="button" onClick={() => onPick(d)} aria-label={d} aria-pressed={picked}
              className={cx('relative aspect-square rounded-pill tabular-nums hover:bg-surface-hover',
                picked ? 'bg-action text-on-action hover:bg-action' : d === today ? 'font-bold text-info' : 'text-ink')}>
              {i + 1}
              {busyDays.has(d) && <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-pill bg-current opacity-50" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
