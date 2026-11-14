// CasualHelpersPanel: the "Temporary workers" tab — search, active/inactive filter and the list.
'use client'

import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { toggleCasualHelperStatus } from '@/app/actions/schedules'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Input,
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
} from '@/components/ui'
import type { CasualHelperItem } from './types'

const PER_PAGE = 10
type Status = 'all' | 'active' | 'inactive'

export function CasualHelpersPanel({
  helpers,
  loading,
  onEdit,
  onChanged,
}: {
  helpers: CasualHelperItem[]
  loading: boolean
  onEdit: (helper: CasualHelperItem) => void
  onChanged: () => void
}) {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status>('active')
  const [page, setPage] = useState(1)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return helpers.filter(
      (h) =>
        (status === 'all' || (h.status || 'active') === status) &&
        (!q || h.full_name.toLowerCase().includes(q) || h.contact_number.includes(q) || (h.notes || '').toLowerCase().includes(q)),
    )
  }, [helpers, search, status])

  async function toggle(h: CasualHelperItem) {
    const res = await toggleCasualHelperStatus(h.id, h.status || 'active')
    if (res?.error) toast.error(res.error)
    else {
      toast.success((h.status || 'active') === 'active' ? `${h.full_name} set to inactive` : `${h.full_name} is active again`)
      onChanged()
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Worker status"
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
          items={[
            { value: 'active', label: 'Active', count: helpers.filter((h) => (h.status || 'active') === 'active').length },
            { value: 'inactive', label: 'Inactive', count: helpers.filter((h) => h.status === 'inactive').length },
            { value: 'all', label: 'All', count: helpers.length },
          ]}
        />
        <Input icon={Search} className="w-full sm:w-64" aria-label="Search temporary workers" placeholder="Search name or number" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <TableContainer>
        {!loading && shown.length === 0 ? (
          <EmptyState icon={Users} title="No temporary workers here" description="Add helpers you hire per job so you can put them on a crew." />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Mobile number</TableHeaderCell>
                <TableHeaderCell numeric>Daily rate</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell align="right"><span className="sr-only">Actions</span></TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-ink-3">Loading temporary workers…</TableCell>
                </TableRow>
              )}
              {shown.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((h) => {
                const active = (h.status || 'active') === 'active'
                return (
                  <TableRow key={h.id}>
                    <TableCell>
                      <span className="flex items-center gap-2.5 font-medium whitespace-nowrap">
                        <Avatar name={h.full_name} size="xs" />
                        {h.full_name}
                      </span>
                    </TableCell>
                    <TableCell mono>{h.contact_number}</TableCell>
                    <TableCell numeric>₱{(h.daily_rate || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell><Badge tone={active ? 'success' : 'neutral'} dot>{active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell align="right">
                      <span className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(h)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggle(h)}>{active ? 'Set inactive' : 'Set active'}</Button>
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {shown.length > PER_PAGE && (
          <Pagination currentPage={page} totalPages={Math.ceil(shown.length / PER_PAGE)} totalItems={shown.length} itemsPerPage={PER_PAGE} onPageChange={setPage} itemNamePlural="workers" />
        )}
      </TableContainer>
    </>
  )
}
