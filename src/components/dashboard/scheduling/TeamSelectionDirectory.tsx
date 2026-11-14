// TeamSelectionDirectory: pick the crew for a job — search, filter by kind, see who's already busy, then choose the lead.
'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Car, Check, Search } from 'lucide-react'
import { Avatar, Badge, Field, Input, Select, Tabs, cx } from '@/components/ui'
import { busyWith } from './teamConflicts'
import type { CasualHelperItem, ProfileItem, ScheduleItem } from './types'

interface TeamSelectionDirectoryProps {
  profiles: ProfileItem[]
  /** Kept for callers; temporary workers are picked in TemporaryWorkerPicker. */
  casualHelpers?: CasualHelperItem[]
  selectedTechIds: string[]
  onToggleTech: (id: string) => void
  leadTechId: string
  onSelectLead: (id: string) => void
  targetDate?: string
  startTime?: string
  endTime?: string
  existingSchedules?: ScheduleItem[]
  requireLead?: boolean
  hideCasualHelpers?: boolean
}

type Kind = 'all' | 'senior' | 'technician' | 'helper' | 'driver'

function kindOf(p: ProfileItem) {
  if (p.technician_level === 'senior') return 'Senior technician'
  if (p.role === 'helper' || p.technician_level === 'helper') return 'Helper'
  return 'Technician'
}

export default function TeamSelectionDirectory({
  profiles,
  selectedTechIds,
  onToggleTech,
  leadTechId,
  onSelectLead,
  targetDate,
  startTime,
  endTime,
  existingSchedules = [],
  requireLead = true,
}: TeamSelectionDirectoryProps) {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const busy = useMemo(() => busyWith(profiles, existingSchedules, targetDate, startTime, endTime), [profiles, existingSchedules, targetDate, startTime, endTime])

  const q = search.trim().toLowerCase()
  const shown = profiles.filter(
    (p) =>
      (!q || p.full_name.toLowerCase().includes(q)) &&
      (kind === 'all' ||
        (kind === 'senior' && p.technician_level === 'senior') ||
        (kind === 'technician' && p.role === 'technician' && p.technician_level === 'technician') ||
        (kind === 'helper' && (p.role === 'helper' || p.technician_level === 'helper')) ||
        (kind === 'driver' && p.is_driver)),
  )
  const picked = profiles.filter((p) => selectedTechIds.includes(p.id))

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-col gap-2">
        <Input icon={Search} aria-label="Search staff" placeholder="Search name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Tabs size="sm" label="Kind of staff" value={kind} onChange={setKind} items={[{ value: 'all', label: 'All' }, { value: 'senior', label: 'Senior' }, { value: 'technician', label: 'Technician' }, { value: 'helper', label: 'Helper' }, { value: 'driver', label: 'Drivers' }]} />
      </div>

      <p className="text-caption text-ink-3">{selectedTechIds.length} picked · tap a person to add or remove them</p>
      <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
        {shown.length === 0 && <li className="py-6 text-center text-small text-ink-3">No one matches.</li>}
        {shown.map((p) => {
          const on = selectedTechIds.includes(p.id)
          const clash = busy.get(p.id)
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onToggleTech(p.id)}
                aria-pressed={on}
                className={cx('flex w-full cursor-pointer items-center gap-3 rounded-control border p-3 text-left transition-colors', on ? 'border-ink bg-surface-soft' : 'border-line hover:border-line-strong')}
              >
                <Avatar name={p.full_name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-small font-medium text-ink">{p.full_name}</span>
                    {p.is_driver && <Badge icon={Car}>Driver</Badge>}
                    {leadTechId === p.id && <Badge tone="info">Lead</Badge>}
                  </span>
                  <span className={cx('flex items-center gap-1 text-caption', clash ? 'text-warning' : 'text-ink-3')}>
                    {clash && <AlertTriangle className="size-3 shrink-0" aria-hidden />}
                    {kindOf(p)} · {clash ?? 'Free then'}
                  </span>
                </span>
                <span className={cx('flex size-5 shrink-0 items-center justify-center rounded-chip border', on ? 'border-action bg-action text-on-action' : 'border-line-strong')} aria-hidden>
                  {on && <Check className="size-3.5" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {requireLead && (
        <Field label="Who leads?" htmlFor="team-lead" hint={picked.length ? 'The lead times in first and answers for the job.' : 'Pick at least one person above first.'}>
          <Select
            id="team-lead"
            placeholder="Choose the lead"
            value={leadTechId}
            disabled={picked.length === 0}
            onChange={(e) => onSelectLead(e.target.value)}
            options={picked.map((p) => ({ value: p.id, label: `${p.full_name} (${kindOf(p)}${p.is_driver ? ', driver' : ''})` }))}
          />
        </Field>
      )}
    </div>
  )
}
