// ScheduleToolbar: the one row above the Scheduling board, laid out like the reference: the title, the day
// (‹ Today › and the date) on the left; the views, "Find a person" (press / to jump there), VIP squeeze-in and New job on the right.
'use client'

import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, Zap } from 'lucide-react'
import { Button, IconButton, Input, Tabs } from '@/components/ui'
import { HelpButton } from '@/components/help/HelpButton'

export type View = 'day' | 'week' | 'list' | 'vehicles' | 'temps'

type Props = {
  view: View; onView: (v: View) => void; vehicles: number; temps: number
  dateLabel: string | null; onStep: (n: number) => void; onToday: () => void
  search: string; onSearch: (s: string) => void; canAdd: boolean; onNew: () => void; onVip: () => void
}

export function ScheduleToolbar({ view, onView, vehicles, temps, dateLabel, onStep, onToday, search, onSearch, canAdd, onNew, onVip }: Props) {
  const find = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) { e.preventDefault(); find.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const unit = view === 'week' ? 'week' : 'day'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1 pr-2"><h1 className="text-heading font-semibold text-ink">Scheduling</h1><HelpButton /></span>
      {dateLabel && (
        <div className="flex items-center gap-1.5">
          <IconButton icon={ChevronLeft} label={`Previous ${unit}`} variant="ghost" size="sm" onClick={() => onStep(-1)} />
          <Button variant="secondary" size="sm" onClick={onToday}>Today</Button>
          <IconButton icon={ChevronRight} label={`Next ${unit}`} variant="ghost" size="sm" onClick={() => onStep(1)} />
          <span className="pl-1.5 text-heading font-semibold text-ink">{dateLabel}</span>
        </div>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Tabs label="View" size="sm" value={view} onChange={onView} items={[
          { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'list', label: 'List' },
          { value: 'vehicles', label: 'Vehicles', count: vehicles }, { value: 'temps', label: 'Helpers', count: temps },
        ]} />
        {dateLabel && <Input ref={find} icon={Search} size="sm" className="w-full sm:w-48" placeholder="Find a person  ( / )" aria-label="Find a person" value={search} onChange={(e) => onSearch(e.target.value)} />}
        {canAdd && <Button variant="secondary" size="sm" icon={Zap} className="text-warning" onClick={onVip}>VIP squeeze-in</Button>}
        {canAdd && <Button variant="primary" size="sm" icon={Plus} onClick={onNew}>New job</Button>}
      </div>
    </div>
  )
}
