// TempWorkersPanel: the "Temporary workers" tab: helpers hired per job who don't use the app. Search, active /
// inactive, add, edit, turn on or off. Active ones can be put on a crew in the job form.
'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { setTempWorkerActive } from '@/app/actions/tempWorkers'
import { Avatar, Badge, Button, EmptyState, Input, Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow, Tabs, useToast } from '@/components/ui'
import { TempWorkerModal } from './TempWorkerModal'
import type { TempWorkerItem } from './scheduleData'

type Status = 'active' | 'inactive' | 'all'

export function TempWorkersPanel({ workers, readOnly, onChanged }: { workers: TempWorkerItem[]; readOnly: boolean; onChanged: () => void }) {
  const toast = useToast()
  const [status, setStatus] = useState<Status>('active')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<TempWorkerItem | null | undefined>(undefined) // undefined = closed, null = new

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return workers.filter((w) => (status === 'all' || w.status === status) && (!q || w.full_name.toLowerCase().includes(q) || w.contact_number.includes(q)))
  }, [workers, search, status])

  async function toggle(w: TempWorkerItem) {
    const res = await setTempWorkerActive(w.id, w.status !== 'active')
    if (!res.ok) return toast.error(res.error)
    toast.success(w.status === 'active' ? `${w.full_name} set to inactive` : `${w.full_name} is active again`)
    onChanged()
  }

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Worker status" value={status} onChange={setStatus} items={[
          { value: 'active', label: 'Active', count: workers.filter((w) => w.status === 'active').length },
          { value: 'inactive', label: 'Inactive', count: workers.filter((w) => w.status !== 'active').length },
          { value: 'all', label: 'All', count: workers.length },
        ]} />
        <div className="flex flex-wrap gap-2">
          <Input icon={Search} className="w-full sm:w-64" aria-label="Search temporary workers" placeholder="Search name or number" value={search} onChange={(e) => setSearch(e.target.value)} />
          {!readOnly && <Button variant="secondary" icon={Plus} onClick={() => setEditing(null)}>Add worker</Button>}
        </div>
      </div>
      <TableContainer>
        {shown.length === 0 ? (
          <EmptyState icon={Users} title="No temporary workers here" description="Add helpers you hire per job so you can put them on a crew." />
        ) : (
          <Table>
            <TableHead><tr>
              <TableHeaderCell>Name</TableHeaderCell><TableHeaderCell>Mobile number</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell align="right"><span className="sr-only">Actions</span></TableHeaderCell>
            </tr></TableHead>
            <TableBody>
              {shown.map((w) => (
                <TableRow key={w.id}>
                  <TableCell><span className="flex items-center gap-2.5 whitespace-nowrap font-medium"><Avatar name={w.full_name} size="xs" />{w.full_name}</span></TableCell>
                  <TableCell mono>{w.contact_number}</TableCell>
                  <TableCell><Badge tone={w.status === 'active' ? 'success' : 'neutral'} dot>{w.status === 'active' ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell align="right">
                    {!readOnly && <span className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(w)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(w)}>{w.status === 'active' ? 'Set inactive' : 'Set active'}</Button>
                    </span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
      <TempWorkerModal isOpen={editing !== undefined} worker={editing ?? null} onClose={() => setEditing(undefined)} onDone={() => { setEditing(undefined); onChanged() }} />
    </div>
  )
}
