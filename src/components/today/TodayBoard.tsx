// TodayBoard: the Coordinator's Today page (Work v2). Counts (in, late, missing, to approve), any job whose
// lead is missing, everyone on today's jobs with their status, and what's waiting for approval. Updates by
// itself when someone times in or out, and re-checks "missing" every minute.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Page, PageHeader, StatRow, StatTile, TableContainer, Tabs, useToast } from '@/components/ui'
import { CrewTodayTable } from './CrewTodayTable'
import { ApprovalsList } from './ApprovalsList'
import { ActingLeadPrompt } from './ActingLeadPrompt'
import { TimeOutModal } from './TimeOutModal'
import { loadToday, watchToday, type TodayData, type WorkDay } from './todayData'
import { buildRows, jobsNeedingActingLead } from './todayStatus'

type View = 'crew' | 'approvals'

export function TodayBoard() {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [data, setData] = useState<TodayData | null>(null)
  const [view, setView] = useState<View>('crew')
  const [timingOut, setTimingOut] = useState<WorkDay | null>(null)
  const [, tick] = useState(0)

  const load = useCallback(async () => {
    try { setData(await loadToday(supabase)) } catch (err) { toast.error(`Couldn't load today: ${(err as Error).message}`) }
  }, [supabase, toast])
  useEffect(() => { load(); return watchToday(supabase, load) }, [load, supabase])
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(t) }, [])

  const rows = data ? buildRows(data.jobs, data.days, data.onLeave, data.today) : []
  // Earlier days still open show on the crew list as "no time-out" too
  const earlierOpen = (data?.days ?? []).filter((d) => d.work_date !== data?.today && !d.time_out)
  const leadless = data ? jobsNeedingActingLead(data.jobs, rows) : []
  const count = (s: string[]) => rows.filter((r) => s.includes(r.state)).length
  const toApprove = (data?.reviews.length ?? 0) + (data?.overtime.length ?? 0)
  const loading = !data

  return (
    <Page wide>
      <PageHeader title="Today" subtitle="Who's in, who's late or missing, and what needs your decision. Updates by itself." />

      <StatRow>
        <StatTile loading={loading} icon={CheckCircle2} label="In" value={count(['in', 'late', 'review', 'done'])} hint={`of ${rows.length} scheduled`} tone="success" />
        <StatTile loading={loading} icon={Clock} label="Late" value={count(['late'])} hint="More than 15 min after start" tone={count(['late']) ? 'warning' : 'neutral'} />
        <StatTile loading={loading} icon={AlertTriangle} label="Missing" value={count(['missing']) + earlierOpen.length} hint="No time-in, or no time-out" tone={count(['missing']) + earlierOpen.length ? 'danger' : 'neutral'} />
        <StatTile loading={loading} icon={ShieldCheck} label="To approve" value={toApprove} hint="Selfies, time-outs, overtime" tone={toApprove ? 'warning' : 'neutral'} />
      </StatRow>

      {data && leadless.map((job) => <ActingLeadPrompt key={job.id} job={job} rows={rows} onDone={load} />)}

      <Tabs label="Show" value={view} onChange={setView} items={[
        { value: 'crew', label: 'Crew today', count: rows.length + earlierOpen.length },
        { value: 'approvals', label: 'To approve', count: toApprove },
      ]} />

      {view === 'crew' ? (
        <TableContainer>
          {data && (
            <CrewTodayTable
              rows={[
                ...earlierOpen.map((d) => ({ person_id: d.person_id, name: d.name, role: 'office', is_acting_lead: false, level: null, job: null, day: d, state: 'no_time_out' as const })),
                ...rows,
              ]}
              onTimeOut={(r) => setTimingOut(r.day)} />
          )}
        </TableContainer>
      ) : data && (
        <ApprovalsList reviews={data.reviews} overtime={data.overtime} onChanged={load} />
      )}

      <TimeOutModal day={timingOut} onClose={() => setTimingOut(null)} onDone={() => { setTimingOut(null); load() }} />
    </Page>
  )
}
