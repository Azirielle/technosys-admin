// CrewPanel: the floating list beside the map — who's on duty, search, and tap a name to fly to them.
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, Phone, RefreshCw, Search } from 'lucide-react'
import { formatAgo, formatTime } from '@/lib/format'
import { Avatar, Badge, EmptyState, IconButton, Input, Tabs, cx, Skeleton, SkeletonArea } from '@/components/ui'
import { STATUS, timeOnShift, type CrewLocation } from './useCrewLocations'

export function CrewPanel({
  crew,
  loading,
  selectedId,
  onSelect,
  onRefresh,
}: {
  crew: CrewLocation[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onRefresh: () => void
}) {
  const [view, setView] = useState<'on_duty' | 'all'>('on_duty')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const onDuty = crew.filter((c) => c.status === 'on_duty').length
  const q = search.trim().toLowerCase()
  const shown = crew.filter((c) => (view === 'all' || c.status !== 'off_duty') && (!q || c.name.toLowerCase().includes(q)))

  return (
    <section aria-label="Field crew" className="absolute top-4 left-4 z-[400] flex max-h-[calc(100%-2rem)] w-[340px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-card bg-surface shadow-raised">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <h1 className="text-heading font-semibold text-ink">Live map</h1>
          <p className="text-caption text-ink-2">{onDuty} on duty now</p>
        </div>
        <div className="flex gap-1">
          <IconButton icon={RefreshCw} label="Refresh" size="sm" onClick={onRefresh} />
          <IconButton icon={collapsed ? ChevronDown : ChevronUp} label={collapsed ? 'Show list' : 'Hide list'} size="sm" onClick={() => setCollapsed((c) => !c)} />
        </div>
      </header>

      {!collapsed && (
        <>
          <div className="flex flex-col gap-2 px-4 pb-3">
            <Tabs size="sm" label="Show" value={view} onChange={setView} items={[{ value: 'on_duty', label: 'On shift', count: crew.filter((c) => c.status !== 'off_duty').length }, { value: 'all', label: 'Everyone', count: crew.length }]} />
            <Input icon={Search} size="sm" aria-label="Search crew" placeholder="Search name" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ul className="flex-1 overflow-y-auto border-t border-line p-2">
            {loading && crew.length === 0 && (
              <li>
                <SkeletonArea label="Loading crew" className="flex flex-col gap-3 py-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <span key={i} className="flex items-center gap-2.5">
                      <Skeleton className="size-8 shrink-0 rounded-pill" />
                      <Skeleton className="h-4 w-32" />
                    </span>
                  ))}
                </SkeletonArea>
              </li>
            )}
            {!loading && shown.length === 0 && (
              <li>
                <EmptyState
                  icon={MapPin}
                  title={view === 'on_duty' ? 'Nobody on shift' : 'No one found'}
                  description={view === 'on_duty' ? 'Technicians show up here after they time in on the app.' : 'Try another name.'}
                  className="py-8"
                />
              </li>
            )}
            {shown.map((c) => {
              const status = STATUS[c.status]
              const selected = c.id === selectedId
              const onShift = timeOnShift(c.timeIn)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(selected ? null : c.id)}
                    aria-pressed={selected}
                    className={cx('flex w-full cursor-pointer items-center gap-3 rounded-control p-2.5 text-left transition-colors', selected ? 'bg-surface-soft' : 'hover:bg-surface-hover')}
                  >
                    <Avatar name={c.name} src={c.avatar} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-small font-medium text-ink">{c.name}</span>
                        <Badge tone={status.tone} dot>{status.label}</Badge>
                      </span>
                      <span className="block truncate text-caption text-ink-3">
                        {c.status === 'on_duty' && onShift ? `${onShift} on shift · in at ${formatTime(c.timeIn!)}` : `Last GPS ${formatAgo(c.updatedAt)}`}
                      </span>
                    </span>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} aria-label={`Call ${c.name}`} title={`Call ${c.phone}`} className="flex size-8 shrink-0 items-center justify-center rounded-pill text-ink-2 hover:bg-surface hover:text-ink">
                        <Phone className="size-4" aria-hidden />
                      </a>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
