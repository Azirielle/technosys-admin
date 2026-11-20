// JobCrewFields: the "who" part of the job form: the lead (a technician), crew and helpers, the driver with
// a vehicle, and helpers (hired per job, no app). The driver can also be the lead or on the crew.
'use client'

import { X } from 'lucide-react'
import { Field, SearchSelect, Select } from '@/components/ui'
import type { Person, TempWorker, Vehicle } from './jobTypes'

export type CrewValue = { lead_id: string; crew_ids: string[]; helper_ids: string[]; driver_id: string | null; vehicle_id: string | null; temp_worker_ids: string[] }
type Props = { value: CrewValue; onChange: (patch: Partial<CrewValue>) => void; people: Person[]; temps: TempWorker[]; vehicles: Vehicle[]; needsDriver: boolean }

const level = (p: Person) => (p.role === 'helper' ? 'Helper' : p.technician_level === 'senior' ? 'Senior technician' : 'Technician')

function Chips({ ids, nameOf, onRemove }: { ids: string[]; nameOf: (id: string) => string; onRemove: (id: string) => void }) {
  if (!ids.length) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {ids.map((id) => (
        <li key={id} className="flex items-center gap-1 rounded-pill bg-surface-soft py-1 pr-1 pl-3 text-small text-ink">
          {nameOf(id)}
          <button type="button" onClick={() => onRemove(id)} aria-label={`Remove ${nameOf(id)}`} className="cursor-pointer rounded-pill p-1 text-ink-3 hover:bg-surface hover:text-ink">
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function JobCrewFields({ value, onChange, people, temps, vehicles, needsDriver }: Props) {
  const taken = new Set([value.lead_id, ...value.crew_ids, ...value.helper_ids].filter(Boolean) as string[])
  const nameOf = (id: string) => people.find((p) => p.id === id)?.full_name ?? temps.find((t) => t.id === id)?.full_name ?? 'Unknown'
  const free = (filter: (p: Person) => boolean) => people.filter((p) => filter(p) && !taken.has(p.id)).map((p) => ({ value: p.id, label: p.full_name, hint: level(p) }))
  const usable = vehicles.filter((v) => v.status === 'active')
  // Driver: anyone; someone already on this job (lead / crew) can also drive
  const drivers = people.map((p) => ({ value: p.id, label: p.full_name, hint: taken.has(p.id) ? 'On this job' : level(p) }))

  return (
    <div className="flex flex-col gap-stack">
      <Field label="Lead" htmlFor="job-lead" required hint="A technician. If they're absent, you can name an acting lead on the day.">
        <SearchSelect id="job-lead" value={value.lead_id} onChange={(id) => onChange({ lead_id: id })}
          options={[...(value.lead_id ? [{ value: value.lead_id, label: nameOf(value.lead_id) }] : []), ...free((p) => p.role === 'technician')]}
          placeholder="Pick the lead" emptyText="No technician free" />
      </Field>

      <Field label="Crew (technicians)" htmlFor="job-crew">
        <SearchSelect id="job-crew" value="" onChange={(id) => id && onChange({ crew_ids: [...value.crew_ids, id] })}
          options={free((p) => p.role === 'technician')} placeholder="Add a technician" emptyText="No one else free" />
        <Chips ids={value.crew_ids} nameOf={nameOf} onRemove={(id) => onChange({ crew_ids: value.crew_ids.filter((x) => x !== id) })} />
        {/* App-account helpers saved on older jobs: still shown so they can be taken off */}
        <Chips ids={value.helper_ids} nameOf={nameOf} onRemove={(id) => onChange({ helper_ids: value.helper_ids.filter((x) => x !== id) })} />
      </Field>

      <div className="grid grid-cols-1 gap-stack sm:grid-cols-2">
        <Field label="Driver" htmlFor="job-driver" hint={needsDriver && !value.driver_id ? 'Who drives? They report to the office first.' : 'Times out only after returning the vehicle.'}>
          <SearchSelect id="job-driver" value={value.driver_id ?? ''} onChange={(id) => onChange({ driver_id: id || null, vehicle_id: id ? value.vehicle_id : null })}
            options={drivers}
            placeholder="No driver" emptyText="No one free" />
        </Field>
        <Field label="Vehicle" htmlFor="job-vehicle" hint={usable.length ? undefined : 'Add vehicles in the Vehicles tab first.'}>
          <Select id="job-vehicle" value={value.vehicle_id ?? ''} disabled={!value.driver_id || !usable.length}
            onChange={(e) => onChange({ vehicle_id: e.target.value || null })}
            placeholder="Pick the vehicle" options={usable.map((v) => ({ value: v.id, label: `${v.name} · ${v.plate}` }))} />
        </Field>
      </div>

      <Field label="Helpers (no app)" htmlFor="job-temps">
        <SearchSelect id="job-temps" value="" onChange={(id) => id && onChange({ temp_worker_ids: [...value.temp_worker_ids, id] })}
          options={temps.filter((t) => !value.temp_worker_ids.includes(t.id)).map((t) => ({ value: t.id, label: t.full_name, hint: t.contact_number ?? undefined }))}
          placeholder="Add a helper" emptyText="None left" />
        <Chips ids={value.temp_worker_ids} nameOf={nameOf} onRemove={(id) => onChange({ temp_worker_ids: value.temp_worker_ids.filter((x) => x !== id) })} />
      </Field>
    </div>
  )
}
