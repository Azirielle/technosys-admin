// ScheduleBoard: the Coordinator's Scheduling page (Work v2), laid out like the FieldCamp "Resource" view. Day = one column per person through the day;
// Week = one row per person; List = all jobs as a table; Vehicles; Temporary workers. Beside the board: the
// month, the day's agenda and "Needs you". Day and Week fill the screen height: only the board scrolls, not the page.
// Jobs, people and empty slots open side drawers. readOnly = HR with borrowed access.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Page, Tabs, cx, useToast } from '@/components/ui'
import { usePageCommand } from '@/components/commands/pageCommands'
import { JobDetailDrawer } from '@/components/jobs/JobDetailDrawer'
import { JobFormDrawer } from '@/components/jobs/JobFormDrawer'
import { WorkTypeBadge } from '@/components/jobs/WorkTypeBadge'
import { VehiclesPanel } from '@/components/jobs/VehiclesPanel'
import { loadFormOptions, loadJobs } from '@/components/jobs/jobsData'
import { manilaToday, type Job, type JobInput, type Office, type Person, type TempWorker, type Vehicle } from '@/components/jobs/jobTypes'
import { DayBoard } from './DayBoard'
import { WeekBoard } from './WeekBoard'
import { MiniCalendar } from './MiniCalendar'
import { DayAgenda } from './DayAgenda'
import { NeedsYou } from './NeedsYou'
import { DayJobsPanel } from './DayJobsPanel'
import { ScheduleToolbar, type View } from './ScheduleToolbar'
import { PersonDrawer } from './PersonDrawer'
import { ScheduleStats } from './ScheduleStats'
import { JobsList } from './JobsList'
import { TempWorkersPanel } from './TempWorkersPanel'
import { loadLeaveAndDays, loadTempWorkers, watchSchedule, type DayLog, type LeaveDay, type OfficeLog, type TempWorkerItem } from './scheduleData'
import { addDays, isFree, longDate, manilaNowMinutes, weekLabel, weekStart, type Sched } from './scheduleMath'

type Who = 'all' | 'technician' | 'helper' | 'free'

export function ScheduleBoard({ readOnly = false }: { readOnly?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const today = manilaToday()
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(today)
  const [who, setWho] = useState<Who>('all')
  const [search, setSearch] = useState('')
  const [freeOn, setFreeOn] = useState<string | null>(null)
  const [now, setNow] = useState(manilaNowMinutes)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [extra, setExtra] = useState<{ leaves: LeaveDay[]; days: DayLog[]; officeCheckIns: OfficeLog[] }>({ leaves: [], days: [], officeCheckIns: [] })
  const [opts, setOpts] = useState<{ people: Person[]; temps: TempWorker[]; vehicles: Vehicle[]; offices: Office[] }>({ people: [], temps: [], vehicles: [], offices: [] })
  const [tempList, setTempList] = useState<TempWorkerItem[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [person, setPerson] = useState<Person | null>(null)
  const [form, setForm] = useState<{ open: boolean; job: Job | null; prefill?: Partial<JobInput> }>({ open: false, job: null })

  // Load the month around the day shown (and its whole week), plus about 6 months back for the List tab
  const month = date.slice(0, 7)
  const from = [addDays(`${month}-01`, -7), weekStart(date), addDays(today, -186)].sort()[0] // ~6 months back: the List tab's month filter
  const to = [addDays(`${month}-01`, 45), addDays(weekStart(date), 6)].sort()[1]
  const load = useCallback(async () => {
    try {
      const [j, o, x, t] = await Promise.all([loadJobs(supabase, from), loadFormOptions(supabase), loadLeaveAndDays(supabase, from, to), loadTempWorkers(supabase)])
      setJobs(j); setOpts(o); setExtra(x); setTempList(t)
    } catch (err) {
      toast.error(`Couldn't load the schedule: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, toast, from, to])
  useEffect(() => { load() }, [load])
  // Live: reload on job, crew or time-in changes; move the "now" line every minute
  useEffect(() => watchSchedule(supabase, load), [supabase, load])
  useEffect(() => { const t = setInterval(() => setNow(manilaNowMinutes()), 60000); return () => clearInterval(t) }, [])

  const people = useMemo(() => [...opts.people].sort((a, b) =>
    (a.role === b.role ? 0 : a.role === 'technician' ? -1 : 1) || a.full_name.localeCompare(b.full_name)), [opts.people])
  const S: Sched = useMemo(() => ({ jobs, leaves: extra.leaves, days: extra.days, people, officeCheckIns: extra.officeCheckIns }), [jobs, extra, people])
  const q = search.trim().toLowerCase()
  const shown = people.filter((p) => (who === 'all' || who === 'free' || p.role === who) && (!q || p.full_name.toLowerCase().includes(q))
    && (who !== 'free' || isFree(S, p.id, date)) && (view !== 'week' || !freeOn || isFree(S, p.id, freeOn)))
  const busyDays = useMemo(() => {
    const set = new Set<string>()
    for (const j of jobs) if (j.status !== 'cancelled') for (let d = j.start_date; d <= j.end_date; d = addDays(d, 1)) set.add(d)
    return set
  }, [jobs])
  const opened = jobs.find((j) => j.id === openId) ?? null

  usePageCommand(readOnly ? ['open'] : ['new', 'open'], (command, id) => {
    if (command === 'new') return setForm({ open: true, job: null })
    const j = jobs.find((x) => x.id === id)
    if (j) { setDate(j.start_date > today || j.end_date < today ? j.start_date : today); setOpenId(j.id) }
  })

  function newJob(p: Person, day: string, time?: string) {
    if (readOnly) return
    const start = time ?? '08:00', end = `${String(Math.min(23, Number(start.slice(0, 2)) + 4)).padStart(2, '0')}:${start.slice(3)}`
    const who = p.role === 'helper' ? { helper_ids: [p.id] } : { lead_id: p.id }
    setPerson(null)
    setForm({ open: true, job: null, prefill: { start_date: day, end_date: day, start_time: start, end_time: end, ...who } })
  }
  // VIP squeeze-in: the job form with VIP ticked, on the day shown, from the next half hour (2 hours long)
  function vipJob() {
    const m = date === today ? Math.min(Math.ceil(now / 30) * 30, 21 * 60) : 8 * 60
    const hm = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
    setForm({ open: true, job: null, prefill: { is_vip: true, start_date: date, end_date: date, start_time: hm(m), end_time: hm(m + 120) } })
  }
  const step = (n: number) => setDate(addDays(date, view === 'week' ? 7 * n : n))
  const onBoard = view === 'day' || view === 'week'
  const dateLabel = view === 'week' ? weekLabel(weekStart(date)) : `${longDate(date)}${date === today ? ' · today' : ''}`

  return (
    <Page wide className={onBoard || view === 'list' ? 'lg:h-full' : undefined}>
      <div className="flex flex-col gap-3">
        <ScheduleToolbar view={view} onView={setView} vehicles={opts.vehicles.length} temps={tempList.filter((t) => t.status === 'active').length}
          dateLabel={onBoard ? dateLabel : null} /* the date bar only where it changes something (Day, Week) */
          onStep={step} onToday={() => { setDate(today); setFreeOn(null) }} search={search} onSearch={setSearch}
          canAdd={!readOnly && !loading} onNew={() => setForm({ open: true, job: null })} onVip={vipJob} />
        <div className="flex flex-col gap-2 border-y border-line py-2">
          {/* Filters and day stats only work on Day / Week; List, Vehicles and Helpers keep the same row with the legend */}
          {onBoard && <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2">
              <span className="text-micro font-semibold tracking-wide text-ink-3 uppercase">Filters</span>
              <Tabs label="Show" size="sm" value={who} onChange={setWho} items={[
                { value: 'all', label: 'Everyone' }, { value: 'technician', label: 'Technicians' }, { value: 'helper', label: 'Helpers' }, { value: 'free', label: 'Free' },
              ]} />
            </span>
            <ScheduleStats S={S} date={date} today={today} now={now} />
          </div>}
          <div className="flex flex-wrap items-center gap-2 text-micro text-ink-3">
            <span>Kinds of work:</span>
            <WorkTypeBadge workType="on_site" className="text-[10.5px] py-0 px-1.5" />
            <WorkTypeBadge workType="in_house" className="text-[10.5px] py-0 px-1.5" />
            <WorkTypeBadge workType="out_of_town" className="text-[10.5px] py-0 px-1.5" />
            <WorkTypeBadge workType="office" className="text-[10.5px] py-0 px-1.5" />
          </div>
        </div>
      </div>

      {onBoard ? (
        // One white workspace like the reference: the board (with the jobs table under it on Day) and the side
        // panel. On wide screens it fills the rest of the screen and only the board scrolls inside.
        <div className={cx('grid overflow-hidden rounded-card bg-surface shadow-card lg:min-h-[380px] lg:flex-1 lg:grid-rows-[minmax(0,1fr)]', view === 'day' && 'lg:grid-cols-[minmax(0,1fr)_260px]')}>
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="max-h-[75vh] min-h-0 flex-1 overflow-auto lg:max-h-none">
              {loading ? <p className="p-8 text-center text-small text-ink-2">Loading the schedule…</p> : view === 'day'
                ? <DayBoard S={S} people={shown} date={date} today={today} now={now} onOpenJob={(j) => setOpenId(j.id)} onOpenPerson={setPerson} onNew={readOnly ? undefined : (p, t) => newJob(p, date, t)} />
                : <WeekBoard S={S} people={shown} monday={weekStart(date)} date={date} today={today} now={now} freeOn={freeOn}
                    onToggleFree={(d) => setFreeOn(freeOn === d ? null : d)} onOpenJob={(j) => setOpenId(j.id)} onOpenPerson={setPerson} onNew={readOnly ? undefined : (p, d) => newJob(p, d)} />}
            </div>
            {view === 'day' && !loading && <DayJobsPanel S={S} date={date} today={today} now={now} onOpenJob={(j) => setOpenId(j.id)} />}
          </div>
          {/* The side panel keeps room for its scrollbar, so opening or closing a part never squeezes the calendar */}
          {view === 'day' && <aside className="flex flex-col gap-3 border-t border-line p-4 [scrollbar-gutter:stable] [scrollbar-width:thin] lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:pr-2">
            <MiniCalendar value={date} today={today} busyDays={busyDays} onPick={(d) => { setDate(d); setFreeOn(null) }} />
            <NeedsYou S={S} date={date} today={today} now={now} readOnly={readOnly} onOpenJob={(j) => setOpenId(j.id)} onEditJob={(job) => setForm({ open: true, job })} />
            <DayAgenda S={S} date={date} today={today} now={now} onOpenJob={(j) => setOpenId(j.id)} />
          </aside>}
        </div>
      ) : view === 'list' ? (
        <JobsList jobs={jobs} loading={loading} onOpen={(j) => setOpenId(j.id)} />
      ) : view === 'vehicles' ? (
        <VehiclesPanel vehicles={opts.vehicles} offices={opts.offices} readOnly={readOnly} onChanged={load} />
      ) : (
        <TempWorkersPanel workers={tempList} readOnly={readOnly} onChanged={load} />
      )}

      <PersonDrawer S={S} person={person} date={view === 'week' && freeOn ? freeOn : date} today={today} now={now} readOnly={readOnly}
        onClose={() => setPerson(null)} onOpenJob={(j) => { setPerson(null); setOpenId(j.id) }} onSchedule={(p) => newJob(p, freeOn ?? date)} />
      <JobDetailDrawer job={form.open ? null : opened} vehicles={opts.vehicles} readOnly={readOnly} onClose={() => setOpenId(null)}
        onEdit={(job) => setForm({ open: true, job })} onChanged={() => { setOpenId(null); load() }} />
      <JobFormDrawer open={form.open} job={form.job} prefill={form.prefill} people={opts.people} temps={opts.temps} vehicles={opts.vehicles} offices={opts.offices}
        onClose={() => setForm({ open: false, job: null })} onSaved={() => { setForm({ open: false, job: null }); load() }} />
    </Page>
  )
}
