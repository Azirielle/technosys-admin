// ActivityBoard: the CEO's Activity history — who did what and when, straight from the activity log.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, History, RefreshCw, Search } from 'lucide-react'
import { getActivityLogs, type ActivityLog } from '@/app/actions/activity'
import { formatDay, formatTime } from '@/lib/format'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Page,
  PageHeader,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  useToast,
  SkeletonTableRows,
} from '@/components/ui'
import { GROUPS, areaLabel, roleName } from './activityLabels'

const PER_PAGE = 8
const LOAD = 1000 // one month's actions (Supabase returns at most 1000 per request); shortcut: a busier month shows only the newest 1000
const thisMonth = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 7) // Manila
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + by, 1))
  return d.toISOString().slice(0, 7)
}
const monthName = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function when(iso: string) {
  return `${formatDay(iso)}, ${formatTime(iso)}`
}

export function ActivityBoard() {
  const toast = useToast()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [group, setGroup] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [month, setMonth] = useState(thisMonth) // C22: one month at a time
  const [open, setOpen] = useState<ActivityLog | null>(null)

  const load = useCallback(async () => {
    const res = await getActivityLogs('all', 1, LOAD, month)
    if (res.error) toast.error(`Couldn't load activity: ${res.error}`)
    setLogs(res.logs ?? [])
    setLoading(false)
  }, [toast, month])

  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(() => {
    const areas = GROUPS.find((g) => g.value === group)?.areas
    const q = search.trim().toLowerCase()
    return logs.filter(
      (l) => (!areas || areas.includes(l.category)) && (!q || [l.description, l.action, l.performed_by_name].some((v) => (v || '').toLowerCase().includes(q))),
    )
  }, [logs, group, search])

  return (
    <Page wide>
      <PageHeader
        title="Activity history"
        subtitle="Everything office staff did in the admin, newest first, one month at a time."
        actions={
          <Button
            icon={RefreshCw}
            loading={refreshing}
            onClick={async () => {
              setRefreshing(true)
              await load()
              setRefreshing(false)
            }}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1" role="group" aria-label="Month">
          <IconButton icon={ChevronLeft} label="Previous month" size="sm" onClick={() => { setMonth((m) => shiftMonth(m, -1)); setPage(1) }} />
          <span className="min-w-32 text-center text-small font-medium text-ink">{monthName(month)}</span>
          <IconButton icon={ChevronRight} label="Next month" size="sm" disabled={month >= thisMonth()} onClick={() => { setMonth((m) => shiftMonth(m, 1)); setPage(1) }} />
        </div>
        <Tabs
          label="Area"
          value={group}
          onChange={(v) => { setGroup(v); setPage(1) }}
          items={GROUPS.map((g) => ({ value: g.value, label: g.label, count: g.areas ? logs.filter((l) => g.areas!.includes(l.category)).length : logs.length }))}
        />
        <Input icon={Search} className="w-full sm:w-72" aria-label="Search activity" placeholder="Search what happened or who" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <TableContainer>
        {!loading && shown.length === 0 ? (
          <EmptyState
            icon={History}
            title={logs.length ? 'Nothing matches' : 'No activity yet'}
            description={logs.length ? 'Try another area or search.' : 'Approvals, corrections, new jobs and other office actions are listed here as they happen.'}
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>When</TableHeaderCell>
                <TableHeaderCell>Who</TableHeaderCell>
                <TableHeaderCell>What happened</TableHeaderCell>
                <TableHeaderCell>Area</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {loading && (
                <SkeletonTableRows cols={4} />
              )}
              {shown.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((l) => (
                <TableRow key={l.id} onClick={() => setOpen(l)}>
                  <TableCell className="whitespace-nowrap text-ink-2">{when(l.created_at)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Avatar name={l.performed_by_name || 'Staff'} size="xs" />
                      <span><span className="block font-medium">{l.performed_by_name || 'Staff'}</span><span className="block text-caption text-ink-3">{roleName(l.performed_by_role)}</span></span>
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xl"><span className="line-clamp-2">{l.description || l.action}</span></TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge>{areaLabel(l.category)}</Badge>
                      {l.is_override && <Badge tone="warning" title="Done by someone outside their usual pages">Temporary access</Badge>}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {shown.length > PER_PAGE && (
          <Pagination currentPage={page} totalPages={Math.ceil(shown.length / PER_PAGE)} totalItems={shown.length} itemsPerPage={PER_PAGE} onPageChange={setPage} itemNamePlural="actions" />
        )}
      </TableContainer>

      <Modal isOpen={open !== null} onClose={() => setOpen(null)} icon={History} title={open ? areaLabel(open.category) : ''} subtitle={open ? when(open.created_at) : ''} maxWidth="md" footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
        {open && (
          <dl className="flex flex-col gap-3 text-small">
            <div><dt className="text-caption text-ink-3">Who</dt><dd className="text-ink">{open.performed_by_name || 'Staff'} ({roleName(open.performed_by_role)})</dd></div>
            <div><dt className="text-caption text-ink-3">What happened</dt><dd className="whitespace-pre-wrap text-ink">{open.description || '—'}</dd></div>
            <div><dt className="text-caption text-ink-3">Action</dt><dd className="font-mono text-caption text-ink-2">{open.action}</dd></div>
            {open.is_override && <p className="rounded-control bg-warning-soft p-3 text-caption text-warning">Done on a page outside this person's usual role, through temporary access.</p>}
          </dl>
        )}
      </Modal>
    </Page>
  )
}
