import { Briefcase, MapPin, Wrench, PackageX } from 'lucide-react'
import { getOverview } from '@/lib/overview'
import {
  OverviewPage, StatRow, StatTile, Panel, PanelRow, Badge, formatTime, formatAgo, JOB_STATUS,
} from '@/components/overview/OverviewParts'

export const dynamic = 'force-dynamic'

export default async function CoordinatorOverviewPage() {
  const o = await getOverview()
  const unstaffed = o.jobsToday.filter((j) => !j.hasLead).length

  return (
    <OverviewPage title="Service overview" subtitle="Today's jobs, crews in the field and tools out." date={o.date}>
      <StatRow>
        <StatTile icon={Briefcase} label="Jobs today" value={o.jobsToday.length} hint={unstaffed ? `${unstaffed} without a lead technician` : 'All jobs have a lead'} tone={unstaffed ? 'alert' : 'neutral'} href="/coordinator/dispatch" />
        <StatTile icon={MapPin} label="Crew timed in" value={<>{o.timedIn.length}<span className="text-lg text-[#8E8D9A] font-semibold"> / {o.fieldStaff}</span></>} hint={o.onLeaveToday.length ? `${o.onLeaveToday.length} on leave today` : 'No one on leave'} href="/coordinator/tracking" />
        <StatTile icon={Wrench} label="Tools out" value={o.toolsOut.reduce((n, t) => n + t.qty, 0)} hint={`${o.toolsOut.length} borrowing${o.toolsOut.length === 1 ? '' : 's'} open`} href="/coordinator/inventory" />
        <StatTile icon={PackageX} label="Out of stock" value={o.outOfStock.length} hint={o.outOfStock.length ? o.outOfStock.slice(0, 2).join(', ') : 'Every tool has stock'} tone={o.outOfStock.length ? 'alert' : 'good'} href="/coordinator/inventory" />
      </StatRow>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Today's jobs" count={o.jobsToday.length} href="/coordinator/dispatch" linkLabel="Scheduling" empty="No jobs scheduled for today.">
          {o.jobsToday.map((j) => (
            <PanelRow
              key={j.id}
              primary={j.client}
              secondary={`${j.lead}${j.crew ? ` + ${j.crew} crew` : ''}${j.location ? ` · ${j.location}` : ''}`}
              right={formatTime(j.start)}
              badge={<Badge tone={JOB_STATUS[j.status]?.tone}>{JOB_STATUS[j.status]?.label || j.status}</Badge>}
            />
          ))}
        </Panel>

        <Panel title="Timed in now" count={o.timedIn.length} href="/coordinator/tracking" linkLabel="Live map" empty="No one has timed in yet today.">
          {o.timedIn.map((p) => (
            <PanelRow key={p.id} primary={p.name} right={`Since ${formatTime(p.since)}`} />
          ))}
        </Panel>

        <Panel title="Tools out with crews" count={o.toolsOut.length} href="/coordinator/inventory" linkLabel="Inventory" empty="All tools are in the warehouse.">
          {o.toolsOut.slice(0, 6).map((t) => (
            <PanelRow key={t.id} primary={`${t.qty > 1 ? `${t.qty} × ` : ''}${t.tool}`} secondary={t.name} right={formatAgo(t.since)} />
          ))}
        </Panel>

        <Panel title="Out of stock" count={o.outOfStock.length} href="/coordinator/inventory" linkLabel="Inventory" empty="Every tool has stock available.">
          {o.outOfStock.map((name) => (
            <PanelRow key={name} primary={name} badge={<Badge tone="alert">0 available</Badge>} />
          ))}
        </Panel>
      </div>
    </OverviewPage>
  )
}
