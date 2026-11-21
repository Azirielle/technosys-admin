// JobsList: the "List" tab: every job as a table (Today and upcoming / Earlier / Cancelled), with search and pagination.
'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input, Pagination, TableContainer, Tabs } from '@/components/ui'
import { JobsTable } from '@/components/jobs/JobsTable'
import { manilaToday, type Job } from '@/components/jobs/jobTypes'

type View = 'upcoming' | 'earlier' | 'cancelled'
const PER_PAGE = 8

export function JobsList({ jobs, loading, onOpen }: { jobs: Job[]; loading: boolean; onOpen: (job: Job) => void }) {
  const [view, setView] = useState<View>('upcoming')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const today = manilaToday()
  const groups = useMemo(() => ({
    upcoming: jobs.filter((j) => j.status !== 'cancelled' && j.end_date >= today),
    earlier: jobs.filter((j) => j.status !== 'cancelled' && j.end_date < today).reverse(),
    cancelled: jobs.filter((j) => j.status === 'cancelled').reverse(),
  }), [jobs, today])
  const q = search.trim().toLowerCase()
  const shown = groups[view].filter((j) => !q || j.client_name.toLowerCase().includes(q) || j.address.toLowerCase().includes(q) || j.members.some((m) => m.name.toLowerCase().includes(q)))
  const pageJobs = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Show" value={view} onChange={(v) => { setView(v); setPage(1) }} items={[
          { value: 'upcoming', label: 'Today and upcoming', count: groups.upcoming.length },
          { value: 'earlier', label: 'Earlier', count: groups.earlier.length },
          { value: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
        ]} />
        <Input icon={Search} className="w-full sm:w-64" placeholder="Search client, address or person" aria-label="Search jobs" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
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
