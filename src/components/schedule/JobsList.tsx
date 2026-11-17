// JobsList: the "List" tab: every job as a table (Today and upcoming / Earlier / Cancelled), with search.
'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input, TableContainer, Tabs } from '@/components/ui'
import { JobsTable } from '@/components/jobs/JobsTable'
import { manilaToday, type Job } from '@/components/jobs/jobTypes'

type View = 'upcoming' | 'earlier' | 'cancelled'

export function JobsList({ jobs, loading, onOpen }: { jobs: Job[]; loading: boolean; onOpen: (job: Job) => void }) {
  const [view, setView] = useState<View>('upcoming')
  const [search, setSearch] = useState('')
  const today = manilaToday()
  const groups = useMemo(() => ({
    upcoming: jobs.filter((j) => j.status !== 'cancelled' && j.end_date >= today),
    earlier: jobs.filter((j) => j.status !== 'cancelled' && j.end_date < today).reverse(),
    cancelled: jobs.filter((j) => j.status === 'cancelled').reverse(),
  }), [jobs, today])
  const q = search.trim().toLowerCase()
  const shown = groups[view].filter((j) => !q || j.client_name.toLowerCase().includes(q) || j.address.toLowerCase().includes(q) || j.members.some((m) => m.name.toLowerCase().includes(q)))

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Show" value={view} onChange={setView} items={[
          { value: 'upcoming', label: 'Today and upcoming', count: groups.upcoming.length },
          { value: 'earlier', label: 'Earlier', count: groups.earlier.length },
          { value: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
        ]} />
        <Input icon={Search} className="w-full sm:w-64" placeholder="Search client, address or person" aria-label="Search jobs" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <TableContainer>
        <JobsTable jobs={shown} loading={loading} onOpen={onOpen}
          empty={view === 'upcoming' ? 'No jobs coming up' : view === 'earlier' ? 'No earlier jobs' : 'No cancelled jobs'} />
      </TableContainer>
    </div>
  )
}
