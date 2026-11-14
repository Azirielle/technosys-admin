import { Users, CalendarOff, Inbox, Briefcase } from 'lucide-react'
import { getOverview } from '@/lib/overview'
import {
  OverviewPage, StatRow, StatTile, Panel, PanelRow, Badge, formatTime, formatDay, formatAgo, LEAVE_LABELS, JOB_STATUS,
} from '@/components/overview/OverviewParts'

export const dynamic = 'force-dynamic'

export default async function CeoOverviewPage() {
  const o = await getOverview()
  const waiting = o.pendingLeaves.length + o.openTickets.length + o.pendingOvertime

  return (
    <OverviewPage title="Company overview" subtitle="Attendance, requests, jobs and tools across Technocycle today." date={o.date}>
      <StatRow>
        <StatTile
          icon={Users}
          label="Timed in now"
          value={<>{o.timedIn.length}<span className="text-lg text-[#8E8D9A] font-semibold"> / {o.fieldStaff}</span></>}
          hint={o.flaggedPunchesToday ? `${o.flaggedPunchesToday} punch${o.flaggedPunchesToday === 1 ? '' : 'es'} flagged for HR` : 'No flagged punches today'}
          tone={o.flaggedPunchesToday ? 'attention' : 'good'}
        />
        <StatTile icon={CalendarOff} label="On leave today" value={o.onLeaveToday.length} hint={o.onLeaveToday.length ? o.onLeaveToday.map((l) => l.name).join(', ') : 'Everyone is available'} />
        <StatTile icon={Inbox} label="Requests waiting" value={waiting} hint={`${o.pendingLeaves.length} leave · ${o.pendingOvertime} overtime · ${o.openTickets.length} tickets`} tone={waiting ? 'attention' : 'good'} />
        <StatTile icon={Briefcase} label="Jobs today" value={o.jobsToday.length} hint={`${o.toolsOut.length} tool${o.toolsOut.length === 1 ? '' : 's'} out with crews`} />
      </StatRow>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Working now" count={o.timedIn.length} empty="No one has timed in yet today.">
          {o.timedIn.map((p) => (
            <PanelRow key={p.id} primary={p.name} right={`Since ${formatTime(p.since)}`} badge={p.flagged ? <Badge tone="attention">Check punch</Badge> : <Badge tone="good">In geofence</Badge>} />
          ))}
        </Panel>

        <Panel title="Today's jobs" count={o.jobsToday.length} empty="No jobs scheduled for today.">
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

        <Panel title="Waiting for HR" count={o.pendingLeaves.length + o.openTickets.length} empty="Nothing is waiting for HR.">
          {[
            ...o.pendingLeaves.map((l) => (
              <PanelRow key={`l-${l.id}`} primary={l.name} secondary={`${LEAVE_LABELS[l.type] || l.type} · ${formatDay(l.start)}${l.end !== l.start ? ` to ${formatDay(l.end)}` : ''}`} right={formatAgo(l.filed)} badge={<Badge>Leave</Badge>} />
            )),
            ...o.openTickets.map((t) => (
              <PanelRow key={`t-${t.id}`} primary={t.name} secondary={t.title} right={formatAgo(t.filed)} badge={<Badge>{t.category}</Badge>} />
            )),
          ].slice(0, 6)}
        </Panel>

        <Panel title="Recent activity" href="/ceo/activities" linkLabel="All activity" empty="No activity recorded yet.">
          {o.recentActivity.map((a) => (
            <PanelRow key={a.id} primary={a.text} secondary={a.who} right={formatAgo(a.at)} />
          ))}
        </Panel>
      </div>
    </OverviewPage>
  )
}
