// Company overview page: today at a glance, built only from the UI library.
import { Users, CalendarOff, Inbox, Briefcase } from 'lucide-react'
import { getOverview } from '@/lib/overview'
import { OfficeAnnouncements } from '@/components/announcements/OfficeAnnouncements'
import { Page, PageHeader, StatRow, StatTile, ListCard, ListRow, Badge, Avatar } from '@/components/ui'
import { formatTime, formatDayRange, formatAgo, formatLongDate } from '@/lib/format'
import { LEAVE_LABELS, JOB_STATUS } from '@/lib/labels'

export const dynamic = 'force-dynamic'

export default async function CeoOverviewPage() {
  const o = await getOverview()
  // Task 5: each number is the list it jumps to (the lists below show everyone, not 3)
  const waiting = o.pendingLeaves.length + o.openTickets.length

  return (
    <Page>
      <PageHeader eyebrow={formatLongDate(o.date)} title="Company overview" subtitle="Attendance, requests, jobs and tools across Technocycle today." />

      <StatRow>
        <StatTile
          icon={Users}
          label="Timed in now"
          value={o.timedIn.length} total={o.fieldStaff}
          hint={o.flaggedPunchesToday ? `${o.flaggedPunchesToday} punch${o.flaggedPunchesToday === 1 ? '' : 'es'} flagged for HR` : 'No flagged punches today'}
          tone={o.flaggedPunchesToday ? 'warning' : 'success'}
          href="#working-now"
        />
        <StatTile icon={CalendarOff} label="On leave today" value={o.onLeaveToday.length} hint={o.onLeaveToday.length ? o.onLeaveToday.map((l) => l.name).join(', ') : 'Everyone is available'} href="#on-leave" />
        <StatTile icon={Inbox} label="Waiting for HR" value={waiting} hint={`${o.pendingLeaves.length} leave · ${o.openTickets.length} tickets${o.pendingOvertime ? ` · + ${o.pendingOvertime} overtime` : ''}`} tone={waiting ? 'warning' : 'success'} href="#waiting-for-hr" />
        <StatTile icon={Briefcase} label="Jobs today" value={o.jobsToday.length} hint={`${o.toolsOut.length} tool${o.toolsOut.length === 1 ? '' : 's'} out with crews`} href="#jobs-today" />
      </StatRow>

      <div className="grid grid-cols-1 gap-section lg:grid-cols-2">
        <OfficeAnnouncements href="/ceo/announcements" />
        <div id="working-now" className="scroll-mt-6"><ListCard title="Working now" count={o.timedIn.length} empty="No one has timed in yet today.">
          {o.timedIn.map((p) => (
            <ListRow key={p.id} leading={<Avatar name={p.name} />} primary={p.name} right={`Since ${formatTime(p.since)}`} badge={p.flagged ? <Badge tone="warning">Check punch</Badge> : <Badge tone="success">In geofence</Badge>} />
          ))}
        </ListCard></div>

        <div id="on-leave" className="scroll-mt-6"><ListCard title="On leave today" count={o.onLeaveToday.length} empty="Everyone is available today.">
          {o.onLeaveToday.map((l) => (
            <ListRow key={l.id} leading={<Avatar name={l.name} />} primary={l.name} right={LEAVE_LABELS[l.type] || l.type} />
          ))}
        </ListCard></div>

        <div id="jobs-today" className="scroll-mt-6"><ListCard title="Today's jobs" count={o.jobsToday.length} empty="No jobs scheduled for today.">
          {o.jobsToday.map((j) => (
            <ListRow
              key={j.id}
              primary={j.client}
              secondary={`${j.lead}${j.crew ? ` + ${j.crew} crew` : ''}${j.location ? ` · ${j.location}` : ''}`}
              right={formatTime(j.start)}
              badge={<Badge tone={JOB_STATUS[j.status]?.tone}>{JOB_STATUS[j.status]?.label || j.status}</Badge>}
            />
          ))}
        </ListCard></div>

        <div id="waiting-for-hr" className="scroll-mt-6"><ListCard title="Waiting for HR" count={o.pendingLeaves.length + o.openTickets.length} empty="Nothing is waiting for HR.">
          {[
            ...o.pendingLeaves.map((l) => (
              <ListRow key={`l-${l.id}`} leading={<Avatar name={l.name} />} primary={l.name} secondary={`${LEAVE_LABELS[l.type] || l.type} · ${formatDayRange(l.start, l.end)}`} right={formatAgo(l.filed)} badge={<Badge>Leave</Badge>} />
            )),
            ...o.openTickets.map((t) => (
              <ListRow key={`t-${t.id}`} primary={t.name} secondary={t.title} right={formatAgo(t.filed)} badge={<Badge>{t.category}</Badge>} />
            )),
          ]}
        </ListCard></div>

        <ListCard title="Recent activity" href="/ceo/activities" linkLabel="All activity" empty="No activity recorded yet.">
          {o.recentActivity.slice(0, 3).map((a) => (
            <ListRow key={a.id} primary={a.text} secondary={a.who} right={formatAgo(a.at)} />
          ))}
        </ListCard>
      </div>
    </Page>
  )
}
