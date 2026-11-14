// AnnouncementList: one row per announcement — title and a line of the message, who it's for, priority, status, when.
'use client'

import { Megaphone } from 'lucide-react'
import { formatDay, formatTime } from '@/lib/format'
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { STATUS, audienceLabel, priorityOf, type Announcement } from './types'

function when(a: Announcement) {
  const iso = a.status === 'scheduled' && a.scheduled_for ? a.scheduled_for : a.created_at
  return `${formatDay(iso)}, ${formatTime(iso)}`
}

export function AnnouncementList({
  items,
  loading,
  emptyText,
  onOpen,
}: {
  items: Announcement[]
  loading: boolean
  emptyText: string
  onOpen: (a: Announcement) => void
}) {
  if (!loading && items.length === 0) return <EmptyState icon={Megaphone} title="No announcements here" description={emptyText} />
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Announcement</TableHeaderCell>
          <TableHeaderCell>For</TableHeaderCell>
          <TableHeaderCell>Priority</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>When</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={5} className="py-10 text-center text-ink-3">Loading announcements…</TableCell>
          </TableRow>
        )}
        {!loading &&
          items.map((a) => {
            const priority = priorityOf(a.priority)
            const status = STATUS[a.status] ?? STATUS.draft
            return (
              <TableRow key={a.id} onClick={() => onOpen(a)}>
                <TableCell className="max-w-md">
                  <span className="block truncate font-medium">{a.title}</span>
                  <span className="block truncate text-caption text-ink-3">{a.content}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-ink-2">{audienceLabel(a.audience)}</TableCell>
                <TableCell>{a.priority === 'normal' ? <span className="text-ink-3">Normal</span> : <Badge tone={priority.tone}>{priority.label}</Badge>}</TableCell>
                <TableCell><Badge tone={status.tone} dot>{status.label}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-ink-2">
                  {when(a)}
                  <span className="block text-caption text-ink-3">{a.author?.full_name || 'Office'}</span>
                </TableCell>
              </TableRow>
            )
          })}
      </TableBody>
    </Table>
  )
}
