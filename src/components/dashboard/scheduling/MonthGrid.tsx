// MonthGrid: the month as a grid of days. Each day shows how many jobs and how many people are still free.
'use client'

import { PlaneTakeoff } from 'lucide-react'
import { cx } from '@/components/ui'
import { dayInfo, monthCells } from './calendarDays'
import type { ProfileItem, ScheduleItem } from './types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthGrid({
  year,
  month,
  schedules,
  staff,
  selectedDay,
  onSelect,
}: {
  year: number
  month: number
  schedules: ScheduleItem[]
  staff: ProfileItem[]
  selectedDay: number
  onSelect: (day: number) => void
}) {
  const today = new Date()
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-caption font-medium text-ink-3">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {monthCells(year, month).map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />
          const info = dayInfo(schedules, staff, year, month, day)
          const selected = day === selectedDay
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={selected}
              aria-label={`${day}: ${info.jobs.length} jobs, ${info.free.length} free`}
              className={cx(
                'flex min-h-20 cursor-pointer flex-col gap-1 rounded-control p-2 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-focus',
                selected ? 'bg-action text-on-action' : 'bg-surface-soft hover:bg-surface-hover',
              )}
            >
              <span className="flex items-center justify-between">
                <span className={cx('text-small font-semibold tabular-nums', !selected && isToday(day) && 'flex size-6 items-center justify-center rounded-pill bg-action text-on-action')}>{day}</span>
                {info.outOfTown.length > 0 && <PlaneTakeoff className={cx('size-3.5', selected ? 'opacity-80' : 'text-info')} aria-label="Out-of-town job" />}
              </span>
              {info.jobs.length > 0 && (
                <span className={cx('text-micro font-medium', selected ? 'opacity-90' : 'text-ink')}>
                  {info.jobs.length} {info.jobs.length === 1 ? 'job' : 'jobs'}
                </span>
              )}
              <span className={cx('mt-auto text-micro', selected ? 'opacity-75' : info.free.length === 0 && info.total > 0 ? 'font-medium text-danger' : 'text-ink-3')}>
                {info.free.length === 0 && info.total > 0 ? 'Fully booked' : `${info.free.length} free`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
