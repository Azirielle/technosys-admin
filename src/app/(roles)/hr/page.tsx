// HR overview page: today at a glance, built only from the UI library.
import { CalendarClock, MessageSquare, ShieldAlert, FolderOpen } from 'lucide-react'
import { getOverview } from '@/lib/overview'
import { OfficeAnnouncements } from '@/components/announcements/OfficeAnnouncements'
import { Page, PageHeader, StatRow, StatTile, ListCard, ListRow, Badge, Avatar } from '@/components/ui'
import { formatTime, formatDayRange, formatAgo, formatLongDate } from '@/lib/format'
import { LEAVE_LABELS } from '@/lib/labels'

export const dynamic = 'force-dynamic'

export default async function HrOverviewPage() {
  const o = await getOverview()
  const waiting = o.openTickets.filter((t) => t.waiting).length

  return (
    <Page>
      <PageHeader eyebrow={formatLongDate(o.date)} title="HR overview" subtitle="Requests waiting for you and today's attendance." />

      <StatRow>
        <StatTile icon={CalendarClock} label="Leave requests waiting" value={o.pendingLeaves.length} hint={o.pendingOvertime ? `+ ${o.pendingOvertime} overtime request${o.pendingOvertime === 1 ? '' : 's'}` : 'No overtime requests'} tone={o.pendingLeaves.length ? 'warning' : 'success'} href="/hr/leaves" />
        <StatTile icon={MessageSquare} label="Tickets for HR" value={o.openTickets.length} hint={waiting ? `${waiting} waiting for your reply` : 'No one waiting for a reply'} tone={waiting ? 'warning' : 'success'} href="/hr/tickets" />
        <StatTile icon={ShieldAlert} label="Punches to check today" value={o.flaggedPunchesToday} hint={o.flaggedPunchesToday ? 'Outside geofence, fake GPS or unusual' : 'All punches look normal'} tone={o.flaggedPunchesToday ? 'danger' : 'success'} href="#punches-to-check" />
        <StatTile icon={FolderOpen} label="Incomplete 201 files" value={o.incomplete201} hint={`of ${o.fieldStaff} field staff`} tone={o.incomplete201 ? 'warning' : 'success'} href="/hr/files?show=incomplete" />
      </StatRow>

      <div className="grid grid-cols-1 gap-section lg:grid-cols-2">
        <OfficeAnnouncements href="/hr/announcements" />
        <ListCard title="Leave requests waiting" count={o.pendingLeaves.length} href="/hr/leaves" linkLabel="Review" empty="No leave requests to review.">
          {o.pendingLeaves.slice(0, 3).map((l) => (
            <ListRow key={l.id} leading={<Avatar name={l.name} />} primary={l.name} secondary={`${LEAVE_LABELS[l.type] || l.type} · ${formatDayRange(l.start, l.end)}`} right={formatAgo(l.filed)} />
          ))}
        </ListCard>

        <ListCard title="Tickets for HR" count={o.openTickets.length} href="/hr/tickets" linkLabel="Answer" empty="No tickets need HR.">
          {o.openTickets.slice(0, 3).map((t) => (
            <ListRow key={t.id} primary={t.title} secondary={t.name} right={formatAgo(t.filed)} badge={<Badge tone={t.status === 'in_progress' ? 'warning' : 'neutral'}>{t.status === 'in_progress' ? 'In progress' : 'New'}</Badge>} />
          ))}
        </ListCard>

        <ListCard title="Timed in now" count={o.timedIn.length} href="/hr/audit" linkLabel="Open DTR" empty="No one has timed in yet today.">
          {o.timedIn.slice(0, 3).map((p) => (
            <ListRow key={p.id} leading={<Avatar name={p.name} />} primary={p.name} right={`Since ${formatTime(p.since)}`} badge={p.flagged ? <Badge tone="warning">Check punch</Badge> : undefined} />
          ))}
        </ListCard>

        {/* Task 5: the list behind "Punches to check today" (the card jumps here) */}
        <div id="punches-to-check" className="scroll-mt-6">
          <ListCard title="Punches to check today" count={o.flaggedToday.length} href="/hr/tracking" linkLabel="Live map" empty="All punches today look normal.">
            {o.flaggedToday.map((p) => (
              <ListRow key={p.id} leading={<Avatar name={p.name} />} primary={p.name} secondary={p.why} right={formatTime(p.at)} badge={<Badge tone="warning">Check punch</Badge>} />
            ))}
          </ListCard>
        </div>

        <ListCard title="On leave today" count={o.onLeaveToday.length} empty="Everyone is available today.">
          {o.onLeaveToday.slice(0, 3).map((l) => (
            <ListRow key={l.id} leading={<Avatar name={l.name} />} primary={l.name} right={LEAVE_LABELS[l.type] || l.type} />
          ))}
        </ListCard>
      </div>
    </Page>
  )
}
