// ScheduleMonthCalendarView: the Month view of Scheduling — the month grid on the left, the chosen day's panel on the right.
'use client'

import { useEffect, useState } from 'react'
import { dayInfo } from './calendarDays'
import { MonthGrid } from './MonthGrid'
import { DayPanel } from './DayPanel'
import type { ProfileItem, ScheduleItem } from './types'

interface ScheduleMonthCalendarViewProps {
  currentDate: Date
  schedules: ScheduleItem[]
  technicians?: ProfileItem[]
  onSelectDate?: (d: Date) => void
  onQuickReschedule: (s: ScheduleItem) => void
  onEdit: (s: ScheduleItem) => void
  onSwitchToTimeline?: (d: Date) => void
  onDispatchTechnician?: (techId: string, d: Date) => void
  onNewAssignmentForDate?: (d: Date) => void
}

export default function ScheduleMonthCalendarView({
  currentDate,
  schedules,
  technicians = [],
  onQuickReschedule,
  onEdit,
  onSwitchToTimeline,
  onDispatchTechnician,
  onNewAssignmentForDate,
}: ScheduleMonthCalendarViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const [day, setDay] = useState(() => Math.min(currentDate.getDate(), daysInMonth))

  // Keep the chosen day valid when the month changes (31 Jan → Feb).
  useEffect(() => setDay((d) => Math.min(d, daysInMonth)), [daysInMonth])

  const date = new Date(year, month, day)
  return (
    <div className="grid grid-cols-1 gap-section xl:grid-cols-[1fr_360px]">
      <section className="rounded-card bg-surface p-card shadow-card">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-heading font-semibold text-ink">{currentDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</h2>
          <p className="text-caption text-ink-3">Pick a day to see its jobs and free crew</p>
        </div>
        <MonthGrid year={year} month={month} schedules={schedules} staff={technicians} selectedDay={day} onSelect={setDay} />
      </section>
      <DayPanel
        date={date}
        info={dayInfo(schedules, technicians, year, month, day)}
        onView={onEdit}
        onReschedule={onQuickReschedule}
        onSend={onDispatchTechnician ? (id) => onDispatchTechnician(id, date) : undefined}
        onNewJob={onNewAssignmentForDate ? () => onNewAssignmentForDate(date) : undefined}
        onOpenDay={onSwitchToTimeline ? () => onSwitchToTimeline(date) : undefined}
      />
    </div>
  )
}
