// JobsBoard: the Coordinator's Jobs page (Work v2). Tabs: Today and upcoming / Earlier / Cancelled / Vehicles.
// "New job" opens the form; a row opens the job (history, change, cancel). readOnly = HR with borrowed access: look only.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Briefcase, CalendarClock, Plus, Search, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Page, PageHeader, StatRow, StatTile, TableContainer, Tabs, useToast } from '@/components/ui'
import { JobsTable } from './JobsTable'
import { JobFormDrawer } from './JobFormDrawer'
import { JobDetailDrawer } from './JobDetailDrawer'
import { VehiclesPanel } from './VehiclesPanel'
import { loadFormOptions, loadJobs } from './jobsData'
import { usePageCommand } from '@/components/commands/pageCommands'
import { manilaToday, type Job, type Office, type Person, type TempWorker, type Vehicle } from './jobTypes'

type View = 'upcoming' | 'earlier' | 'cancelled' | 'vehicles'

export function JobsBoard({ readOnly = false }: { readOnly?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [opts, setOpts] = useState<{ people: Person[]; temps: TempWorker[]; vehicles: Vehicle[]; offices: Office[] }>({ people: [], temps: [], vehicles: [], offices: [] })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('upcoming')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; job: Job | null }>({ open: false, job: null })

  const load = useCallback(async () => {
    try {
      const [j, o] = await Promise.all([loadJobs(supabase), loadFormOptions(supabase)])
      setJobs(j); setOpts(o)
    } catch (err) {
      toast.error(`Couldn't load jobs: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])
  useEffect(() => { load() }, [load])

  // Quick actions and search: "new job" or "open job X"
  usePageCommand(readOnly ? ['open'] : ['new', 'open'], (command, id) => {
    if (command === 'new') return setForm({ open: true, job: null })
    if (id) { setView('upcoming'); setOpenId(id) }
  })

  const today = manilaToday()
  const groups = useMemo(() => ({
    upcoming: jobs.filter((j) => j.status !== 'cancelled' && j.end_date >= today),
    earlier: jobs.filter((j) => j.status !== 'cancelled' && j.end_date < today).reverse(),
    cancelled: jobs.filter((j) => j.status === 'cancelled').reverse(),
  }), [jobs, today])
  const todays = groups.upcoming.filter((j) => j.start_date <= today)
  const q = search.trim().toLowerCase()
  const shown = view === 'vehicles' ? [] : groups[view].filter((j) => !q || j.client_name.toLowerCase().includes(q) || j.address.toLowerCase().includes(q) || j.members.some((m) => m.name.toLowerCase().includes(q)))
  const opened = jobs.find((j) => j.id === openId) ?? null

  return (
    <Page wide>
      <PageHeader title="Jobs" subtitle="Schedule a job, pick the crew, and they get it on their phones. Saving checks leave, other jobs and vehicles first."
        actions={readOnly ? undefined : <Button variant="primary" icon={Plus} onClick={() => setForm({ open: true, job: null })} disabled={loading}>New job</Button>} />

      <StatRow>
        <StatTile loading={loading} icon={CalendarClock} label="Today" value={todays.length} hint={todays.length ? 'Jobs running today' : 'No jobs today'} />
        <StatTile loading={loading} icon={Briefcase} label="Coming up" value={groups.upcoming.length - todays.length} hint="Planned after today" />
        <StatTile loading={loading} icon={Truck} label="Vehicles" value={opts.vehicles.filter((v) => v.status === 'active').length} hint={opts.vehicles.length ? 'Active' : 'Add them in Vehicles'} tone={opts.vehicles.length ? 'neutral' : 'warning'} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Show" value={view} onChange={setView} items={[
          { value: 'upcoming', label: 'Today and upcoming', count: groups.upcoming.length },
          { value: 'earlier', label: 'Earlier', count: groups.earlier.length },
          { value: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
          { value: 'vehicles', label: 'Vehicles', count: opts.vehicles.length },
        ]} />
        {view !== 'vehicles' && <Input icon={Search} className="w-full sm:w-64" placeholder="Search client, address or person" aria-label="Search jobs" value={search} onChange={(e) => setSearch(e.target.value)} />}
      </div>

      {view === 'vehicles' ? (
        <VehiclesPanel vehicles={opts.vehicles} offices={opts.offices} onChanged={load} />
      ) : (
        <TableContainer>
          <JobsTable jobs={shown} loading={loading} onOpen={(j) => setOpenId(j.id)}
            empty={view === 'upcoming' ? 'No jobs coming up' : view === 'earlier' ? 'No earlier jobs' : 'No cancelled jobs'} />
        </TableContainer>
      )}

      <JobDetailDrawer job={form.open ? null : opened} vehicles={opts.vehicles} readOnly={readOnly} onClose={() => setOpenId(null)}
        onEdit={(job) => setForm({ open: true, job })} onChanged={() => { setOpenId(null); load() }} />
      <JobFormDrawer open={form.open} job={form.job} people={opts.people} temps={opts.temps} vehicles={opts.vehicles} offices={opts.offices}
        onClose={() => setForm({ open: false, job: null })} onSaved={() => { setForm({ open: false, job: null }); load() }} />
    </Page>
  )
}
