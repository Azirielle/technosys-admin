// Service overview page: today at a glance, built only from the UI library.
import { Briefcase, MapPin, Wrench, PackageX } from 'lucide-react'
import { getOverview } from '@/lib/overview'
import { Page, PageHeader, StatRow, StatTile, ListCard, ListRow, Badge, Avatar } from '@/components/ui'
import { formatTime, formatAgo, formatLongDate } from '@/lib/format'
import { JOB_STATUS } from '@/lib/labels'

export const dynamic = 'force-dynamic'

export default async function CoordinatorOverviewPage() {
  const o = await getOverview()
  const unstaffed = o.jobsToday.filter((j) => !j.hasLead).length

  return (
    <Page>
      <PageHeader eyebrow={formatLongDate(o.date)} title="Service overview" subtitle="Today's jobs, crews in the field and tools out." />

      <StatRow>
        <StatTile icon={Briefcase} label="Jobs today" value={o.jobsToday.length} hint={unstaffed ? `${unstaffed} without a lead technician` : 'All jobs have a lead'} tone={unstaffed ? 'danger' : 'neutral'} href="/coordinator/jobs" />
        <StatTile icon={MapPin} label="Crew timed in" value={o.timedIn.length} total={o.fieldStaff} hint={o.onLeaveToday.length ? `${o.onLeaveToday.length} on leave today` : 'No one on leave'} href="/coordinator/tracking" />
        <StatTile icon={Wrench} label="Tools out" value={o.toolsOut.reduce((n, t) => n + t.qty, 0)} hint={`${o.toolsOut.length} borrowing${o.toolsOut.length === 1 ? '' : 's'} open`} href="/coordinator/inventory" />
        <StatTile icon={PackageX} label="Out of stock" value={o.outOfStock.length} hint={o.outOfStock.length ? o.outOfStock.slice(0, 2).join(', ') : 'Every tool has stock'} tone={o.outOfStock.length ? 'danger' : 'success'} href="/coordinator/inventory" />
      </StatRow>

      <div className="grid grid-cols-1 gap-section lg:grid-cols-2">
        <ListCard title="Today's jobs" count={o.jobsToday.length} href="/coordinator/jobs" linkLabel="Scheduling" empty="No jobs scheduled for today.">
          {o.jobsToday.slice(0, 3).map((j) => (
            <ListRow
              key={j.id}
              primary={j.client}
              secondary={`${j.lead}${j.crew ? ` + ${j.crew} crew` : ''}${j.location ? ` · ${j.location}` : ''}`}
              right={formatTime(j.start)}
              badge={<Badge tone={JOB_STATUS[j.status]?.tone}>{JOB_STATUS[j.status]?.label || j.status}</Badge>}
            />
          ))}
        </ListCard>

        <ListCard title="Timed in now" count={o.timedIn.length} href="/coordinator/tracking" linkLabel="Live map" empty="No one has timed in yet today.">
          {o.timedIn.slice(0, 3).map((p) => (
            <ListRow key={p.id} leading={<Avatar name={p.name} />} primary={p.name} right={`Since ${formatTime(p.since)}`} />
          ))}
        </ListCard>

        <ListCard title="Tools out with crews" count={o.toolsOut.length} href="/coordinator/inventory" linkLabel="Inventory" empty="All tools are in the warehouse.">
          {o.toolsOut.slice(0, 3).map((t) => (
            <ListRow key={t.id} primary={`${t.qty > 1 ? `${t.qty} × ` : ''}${t.tool}`} secondary={t.name} right={formatAgo(t.since)} />
          ))}
        </ListCard>

        <ListCard title="Out of stock" count={o.outOfStock.length} href="/coordinator/inventory" linkLabel="Inventory" empty="Every tool has stock available.">
          {o.outOfStock.slice(0, 3).map((name) => (
            <ListRow key={name} primary={name} badge={<Badge tone="danger">0 available</Badge>} />
          ))}
        </ListCard>
      </div>
    </Page>
  )
}
