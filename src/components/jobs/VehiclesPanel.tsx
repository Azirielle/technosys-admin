// VehiclesPanel: the company vehicles a driver can take (name, plate, where it's returned, active or not),
// with add and edit. A driver times out only after bringing the vehicle back to its home office.
'use client'

import { useState } from 'react'
import { Plus, Truck } from 'lucide-react'
import { saveVehicle } from '@/app/actions/jobs'
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow, useToast } from '@/components/ui'
import type { Office, Vehicle } from './jobTypes'

const STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'in_repair', label: 'In repair' },
  { value: 'retired', label: 'Retired' },
] as const

type Draft = { name: string; plate: string; home_office_id: string; status: Vehicle['status'] }

export function VehiclesPanel({ vehicles, offices, readOnly = false, onChanged }: { vehicles: Vehicle[]; offices: Office[]; readOnly?: boolean; onChanged: () => void }) {
  const toast = useToast()
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>({ name: '', plate: '', home_office_id: offices[0]?.id ?? '', status: 'active' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function open(v: Vehicle | 'new') {
    setEditing(v); setError(null)
    setDraft(v === 'new' ? { name: '', plate: '', home_office_id: offices[0]?.id ?? '', status: 'active' } : { name: v.name, plate: v.plate, home_office_id: v.home_office_id, status: v.status })
  }

  async function save() {
    setSaving(true)
    const res = await saveVehicle(draft, editing && editing !== 'new' ? editing.id : undefined)
    setSaving(false)
    if (!res.ok) return setError(res.error ?? "Couldn't save.")
    toast.success('Vehicle saved')
    setEditing(null)
    onChanged()
  }

  const officeName = (id: string) => offices.find((o) => o.id === id)?.name ?? '—'

  return (
    <div className="flex flex-col gap-stack">
      {!readOnly && <div className="flex justify-end"><Button icon={Plus} onClick={() => open('new')}>Add vehicle</Button></div>}
      <TableContainer>
        {vehicles.length === 0 ? (
          <EmptyState icon={Truck} title="No vehicles yet" description="Add the company vehicles so drivers can be assigned one." />
        ) : (
          <Table>
            <TableHead><tr><TableHeaderCell>Vehicle</TableHeaderCell><TableHeaderCell>Plate</TableHeaderCell><TableHeaderCell>Returned to</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell></tr></TableHead>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id} onClick={readOnly ? undefined : () => open(v)}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell mono>{v.plate}</TableCell>
                  <TableCell className="text-ink-2">{officeName(v.home_office_id)}</TableCell>
                  <TableCell><Badge tone={v.status === 'active' ? 'success' : v.status === 'in_repair' ? 'warning' : 'neutral'} dot>{STATUS.find((s) => s.value === v.status)?.label}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} icon={Truck} title={editing === 'new' ? 'Add a vehicle' : 'Edit vehicle'} maxWidth="md"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save</Button></>}>
        <div className="flex flex-col gap-stack">
          <Field label="Name" htmlFor="veh-name" required><Input id="veh-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="L300 van" /></Field>
          <Field label="Plate number" htmlFor="veh-plate" required><Input id="veh-plate" value={draft.plate} onChange={(e) => setDraft({ ...draft, plate: e.target.value })} placeholder="ABC 1234" /></Field>
          <Field label="Returned to" htmlFor="veh-office" hint="The driver must be inside this office's circle to time out.">
            <Select id="veh-office" value={draft.home_office_id} onChange={(e) => setDraft({ ...draft, home_office_id: e.target.value })} options={offices.map((o) => ({ value: o.id, label: o.name }))} />
          </Field>
          <Field label="Status" htmlFor="veh-status" error={error}>
            <Select id="veh-status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Vehicle['status'] })} options={[...STATUS]} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
