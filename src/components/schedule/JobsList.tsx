// JobsList: the "List" tab: every job as a table (Today and upcoming / Earlier / Cancelled), with search, a week / month
// filter to trace past work (prof, 20 Nov: "per month or per week"), and pagination.
'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input, Pagination, Select, TableContainer, Tabs } from '@/components/ui'
import { addDays, weekStart } from './scheduleMath'
import { JobsTable } from '@/components/jobs/JobsTable'
import { manilaToday, type Job } from '@/components/jobs/jobTypes'

type View = 'upcoming' | 'earlier' | 'cancelled'
const PER_PAGE = 8

/** The periods to pick from: this and last week, this and last month, and the 4 months before (about 6 months are loaded). */
function periods(today: string) {
  const week = weekStart(today)
  const month = (back: number) => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - back)
    const start = d.toISOString().slice(0, 10); d.setUTCMonth(d.getUTCMonth() + 1)
    return { start, end: addDays(d.toISOString().slice(0, 10), -1), name: new Date(`${start}T00:00:00Z`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }
  }
  const months = [0, 1, 2, 3, 4, 5].map(month)
  return [
    { value: 'all', label: 'Any date', start: '0000-01-01', end: '9999-12-31' },
    { value: 'week', label: 'This week', start: week, end: addDays(week, 6) },
    { value: 'last_week', label: 'Last week', start: addDays(week, -7), end: addDays(week, -1) },
    ...months.map((m, i) => ({ value: m.start, label: i === 0 ? `This month (${m.name})` : i === 1 ? `Last month (${m.name})` : m.name, start: m.start, end: m.end })),
  ]
}

export function JobsList({ jobs, loading, onOpen }: { jobs: Job[]; loading: boolean; onOpen: (job: Job) => void }) {
  const [view, setView] = useState<View>('upcoming')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const today = manilaToday()
  const choices = useMemo(() => periods(today), [today])
  const [period, setPeriod] = useState('all')
  const range = choices.find((c) => c.value === period) ?? choices[0]
  const groups = useMemo(() => ({
    upcoming: jobs.filter((j) => j.status !== 'cancelled' && j.end_date >= today),
    earlier: jobs.filter((j) => j.status !== 'cancelled' && j.end_date < today).reverse(),
    cancelled: jobs.filter((j) => j.status === 'cancelled').reverse(),
  }), [jobs, today])
  const q = search.trim().toLowerCase()
  // A job counts in the period when any of its days falls inside it
  const shown = groups[view].filter((j) => j.start_date <= range.end && j.end_date >= range.start).filter((j) => !q || j.client_name.toLowerCase().includes(q) || j.address.toLowerCase().includes(q) || j.members.some((m) => m.name.toLowerCase().includes(q)))
  const pageJobs = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Show" value={view} onChange={(v) => { setView(v); setPage(1) }} items={[
          { value: 'upcoming', label: 'Today and upcoming', count: groups.upcoming.length },
          { value: 'earlier', label: 'Earlier', count: groups.earlier.length },
          { value: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
        ]} />
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Select aria-label="Period" className="w-full sm:w-56" value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1) }} options={choices.map(({ value, label }) => ({ value, label }))} />
          <Input icon={Search} className="w-full sm:w-64" placeholder="Search client, address or person" aria-label="Search jobs" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>
      <TableContainer>
        <JobsTable jobs={pageJobs} loading={loading} onOpen={onOpen}
          empty={view === 'upcoming' ? 'No jobs coming up' : view === 'earlier' ? 'No earlier jobs' : 'No cancelled jobs'} />
        {shown.length > PER_PAGE && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(shown.length / PER_PAGE)}
            totalItems={shown.length}
            itemsPerPage={PER_PAGE}
            onPageChange={setPage}
            itemNamePlural="jobs"
          />
        )}
      </TableContainer>
    </div>
  )
}
