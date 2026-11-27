// TodayBoard: the Coordinator's Today page (Work v2). Counts (in, late, missing, to approve), any job whose
// lead is missing, everyone on today's jobs with their status, and what's waiting for approval. Updates by
// itself when someone times in or out, and re-checks "missing" every minute.
'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, Page, PageHeader, Pagination, StatRow, StatTile, TableContainer, Tabs, useToast } from '@/components/ui'
import { CrewTodayTable } from './CrewTodayTable'
import { ApprovalsList } from './ApprovalsList'
import { ActingLeadPrompt } from './ActingLeadPrompt'
import { TimeOutModal } from './TimeOutModal'
import { loadToday, watchToday, type TodayData, type WorkDay } from './todayData'
import { buildRows, jobsNeedingActingLead } from './todayStatus'

type View = 'crew' | 'approvals'
const PER_PAGE = 8

type CrewRow = { role: string; state: string }
/** Who each card counts, and the same rule filters the list it opens (task 5: the number = the list) */
const FOCUS = {
  in: { label: 'In', has: (r: CrewRow) => r.role !== 'earlier' && ['in', 'late', 'review', 'done'].includes(r.state) },
  late: { label: 'Late', has: (r: CrewRow) => r.state === 'late' },
  missing: { label: 'Missing', has: (r: CrewRow) => r.state === 'missing' || r.role === 'earlier' },
}

function TodayContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentView = (searchParams.get('view') === 'approvals' ? 'approvals' : 'crew') as View

  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [data, setData] = useState<TodayData | null>(null)
  const [page, setPage] = useState(1)
  const [timingOut, setTimingOut] = useState<WorkDay | null>(null)
  // Task 5: a card shows only its people (In / Late / Missing); null = everyone
  const [focus, setFocus] = useState<keyof typeof FOCUS | null>(null)
  const [, tick] = useState(0)

  const setView = useCallback((v: View) => {
    if (v === currentView) return // already there: no extra Back step
    setPage(1)
    const params = new URLSearchParams(searchParams.toString())
    if (v === 'approvals') {
      params.set('view', 'approvals')
    } else {
      params.delete('view')
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [currentView, pathname, router, searchParams])

  const load = useCallback(async () => {
    try { setData(await loadToday(supabase)) } catch (err) { toast.error(`Couldn't load today: ${(err as Error).message}`) }
  }, [supabase, toast])
  useEffect(() => { load(); return watchToday(supabase, load) }, [load, supabase])
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(t) }, [])

  const rows = useMemo(() => (data ? buildRows(data.jobs, data.days, data.onLeave, data.today) : []), [data])
  // Earlier days still open show on the crew list as "no time-out" too
  const earlierOpen = useMemo(() => (data?.days ?? []).filter((d) => d.work_date !== data?.today && !d.time_out), [data])
  const leadless = useMemo(() => (data ? jobsNeedingActingLead(data.jobs, rows) : []), [data, rows])
  const count = (s: string[]) => rows.filter((r) => s.includes(r.state)).length
  const toApprove = (data?.reviews.length ?? 0) + (data?.overtime.length ?? 0)
  const loading = !data

  const allCrewRows = useMemo(() => [
    ...earlierOpen.map((d) => ({ person_id: d.person_id, name: d.name, role: 'earlier', is_acting_lead: false, level: null, job: null, day: d, state: 'no_time_out' as const })),
    ...rows,
  ], [earlierOpen, rows])

  const crewRows = focus ? allCrewRows.filter(FOCUS[focus].has) : allCrewRows
  const pageCrewRows = crewRows.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const openFocus = (f: keyof typeof FOCUS) => { setView('crew'); setFocus(f); setPage(1) }

  return (
    <Page wide>
      <PageHeader title="Today" subtitle="Who's in, who's late or missing, and what needs your decision. Updates by itself." />

      <StatRow>
        <StatTile loading={loading} icon={CheckCircle2} label="In" onClick={() => openFocus('in')} value={allCrewRows.filter(FOCUS.in.has).length} hint={`of ${rows.length} scheduled`} tone="success" />
        <StatTile loading={loading} icon={Clock} label="Late" onClick={() => openFocus('late')} value={allCrewRows.filter(FOCUS.late.has).length} hint="Timed in after the start" tone={count(['late']) ? 'warning' : 'neutral'} />
        <StatTile loading={loading} icon={AlertTriangle} label="Missing" onClick={() => openFocus('missing')} value={allCrewRows.filter(FOCUS.missing.has).length} hint="No time-in, or no time-out" tone={count(['missing']) + earlierOpen.length ? 'danger' : 'neutral'} />
        <StatTile loading={loading} icon={ShieldCheck} label="To approve" onClick={() => setView('approvals')} value={toApprove} hint="Selfies, time-outs, overtime" tone={toApprove ? 'warning' : 'neutral'} />
      </StatRow>

      {data && leadless.map((job) => <ActingLeadPrompt key={job.id} job={job} rows={rows} onDone={load} />)}

      <Tabs label="Show" value={currentView} onChange={setView} items={[
        { value: 'crew', label: 'Crew today', count: allCrewRows.length },
        { value: 'approvals', label: 'To approve', count: toApprove },
      ]} />

      {currentView === 'crew' && focus && (
        <div className="flex items-center gap-2 text-small text-ink-2">
          <span>Showing {FOCUS[focus].label.toLowerCase()} only ({crewRows.length})</span>
          <Button size="sm" variant="ghost" onClick={() => { setFocus(null); setPage(1) }}>Show everyone</Button>
        </div>
      )}
      {currentView === 'crew' ? (
        <TableContainer>
          {data && (
            <>
              <CrewTodayTable
                rows={pageCrewRows}
                onTimeOut={(r) => setTimingOut(r.day)}
              />
              {crewRows.length > PER_PAGE && (
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(crewRows.length / PER_PAGE)}
                  totalItems={crewRows.length}
                  itemsPerPage={PER_PAGE}
                  onPageChange={setPage}
                  itemNamePlural="crew members"
                />
              )}
            </>
          )}
        </TableContainer>
      ) : data && (
        <ApprovalsList reviews={data.reviews} overtime={data.overtime} onChanged={load} />
      )}

      <TimeOutModal day={timingOut} onClose={() => setTimingOut(null)} onDone={() => { setTimingOut(null); load() }} />
    </Page>
  )
}

export function TodayBoard() {
  return (
    <Suspense fallback={<Page wide><PageHeader title="Today" subtitle="Who's in, who's late or missing, and what needs your decision. Updates by itself." /></Page>}>
      <TodayContent />
    </Suspense>
  )
}
