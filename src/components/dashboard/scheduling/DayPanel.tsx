// DayPanel: the side panel of the month calendar — the chosen day's jobs, and who is still free to send.
'use client'

import { useState } from 'react'
import { CalendarClock, Car, Plus, Search, Send, Users } from 'lucide-react'
import { Avatar, Badge, Button, EmptyState, Input, Tabs } from '@/components/ui'
import { jobType, timeOf } from './jobLabels'
import type { DayInfo } from './calendarDays'
import type { ScheduleItem } from './types'

type Crew = 'all' | 'senior' | 'driver' | 'helper'

export function DayPanel({
  date,
  info,
  onView,
  onReschedule,
  onSend,
  onNewJob,
  onOpenDay,
}: {
  date: Date
  info: DayInfo
  onView: (s: ScheduleItem) => void
  onReschedule: (s: ScheduleItem) => void
  onSend?: (techId: string) => void
  onNewJob?: () => void
  onOpenDay?: () => void
}) {
  const [view, setView] = useState<'jobs' | 'free'>('jobs')
  const [search, setSearch] = useState('')
  const [crew, setCrew] = useState<Crew>('all')
  const q = search.trim().toLowerCase()
  const free = info.free.filter(
    (t) =>
      (!q || t.full_name.toLowerCase().includes(q)) &&
      (crew === 'all' || (crew === 'senior' && t.technician_level === 'senior') || (crew === 'driver' && t.is_driver) || (crew === 'helper' && (t.role === 'helper' || t.technician_level === 'helper'))),
  )

  return (
    <aside className="flex flex-col gap-4 rounded-card bg-surface p-card shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-heading font-semibold text-ink">{date.toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
          <p className="text-caption text-ink-2">{info.booked.length} of {info.total} booked · {info.free.length} free{info.onLeave.length ? ` · ${info.onLeave.length} on leave` : ''}</p>
        </div>
        {onNewJob && <Button size="sm" icon={Plus} onClick={onNewJob}>New job</Button>}
      </div>

      <Tabs size="sm" label="Day panel" value={view} onChange={setView} items={[{ value: 'jobs', label: 'Jobs', count: info.jobs.length }, { value: 'free', label: 'Free crew', count: info.free.length }]} />

      {view === 'jobs' ? (
        info.jobs.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No jobs this day" description={`All ${info.free.length} free staff can be sent.`} className="py-8" />
        ) : (
          <ul className="flex flex-col gap-2">
            {info.jobs.map((s) => {
              const crewCount = s.schedule_crew_assignments?.filter((c) => c.status === 'active').length ?? 0
              return (
                <li key={s.id} className="rounded-control bg-surface-soft p-3">
                  <p className="flex items-center justify-between gap-2 text-caption text-ink-3">
                    <span>{jobType(s).label}</span>
                    <span>{timeOf(s.start_time)}{s.end_time ? `–${timeOf(s.end_time)}` : ''}</span>
                  </p>
                  <p className="mt-0.5 truncate text-small font-medium text-ink">{s.project_name || s.client_name}</p>
                  <p className="flex items-center gap-1 text-caption text-ink-2">
                    <Users className="size-3" aria-hidden /> {s.profiles?.full_name || 'No lead yet'}{crewCount > 1 ? ` + ${crewCount - 1}` : ''}
                  </p>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" onClick={() => onView(s)}>View</Button>
                    <Button size="sm" variant="ghost" onClick={() => onReschedule(s)}>Reschedule</Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      ) : (
        <div className="flex flex-col gap-2">
          <Input icon={Search} size="sm" aria-label="Search free crew" placeholder="Search name" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Tabs size="sm" label="Kind of crew" value={crew} onChange={setCrew} items={[{ value: 'all', label: 'All' }, { value: 'senior', label: 'Senior' }, { value: 'driver', label: 'Drivers' }, { value: 'helper', label: 'Helpers' }]} />
          {free.length === 0 ? (
            <p className="py-6 text-center text-small text-ink-3">No one free matches.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {free.map((t) => (
                <li key={t.id} className="flex items-center gap-2.5 py-2">
                  <Avatar name={t.full_name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small font-medium text-ink">{t.full_name}</span>
                    <span className="flex items-center gap-1.5 text-caption text-ink-3">
                      {t.technician_level === 'senior' ? 'Senior' : t.role === 'helper' ? 'Helper' : 'Technician'}
                      {t.is_driver && <Badge icon={Car}>Driver</Badge>}
                    </span>
                  </span>
                  {onSend && <Button size="sm" variant="ghost" icon={Send} onClick={() => onSend(t.id)}>Send</Button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {onOpenDay && <Button variant="ghost" onClick={onOpenDay}>Open this day as a timeline</Button>}
    </aside>
  )
}
