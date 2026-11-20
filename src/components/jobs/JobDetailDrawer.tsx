// JobDetailDrawer: one job: where and when, who's on it (with the driver's vehicle), its history, and the
// Coordinator's actions: change it, or cancel it with a reason the crew sees.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Ban, Building2, MapPin, Pencil, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cancelJob } from '@/app/actions/jobs'
import { formatAgo } from '@/lib/format'
import { Avatar, Badge, Button, Drawer, Field, Input, SkeletonText, useToast } from '@/components/ui'
import { loadJobEvents, type JobEvent } from './jobsData'
import { ROLE_LABEL, STATUS, clock, dateRange, type Job, type Vehicle } from './jobTypes'

const EVENT_LABEL: Record<string, string> = {
  created: 'Job created', moved: 'Moved', cancelled: 'Cancelled', crew_changed: 'Crew changed',
  arrived: 'Arrived at the site', done: 'Marked done', acting_lead: 'Acting lead named', finished: 'Job finished',
}

type Props = { job: Job | null; vehicles: Vehicle[]; readOnly?: boolean; onClose: () => void; onEdit: (job: Job) => void; onChanged: () => void }

export function JobDetailDrawer({ job, vehicles, readOnly = false, onClose, onEdit, onChanged }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [events, setEvents] = useState<JobEvent[] | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEvents(null); setCancelling(false); setReason(''); setError(null)
    if (job) loadJobEvents(supabase, job.id).then(setEvents).catch(() => setEvents([]))
  }, [job, supabase])

  if (!job) return null
  const status = STATUS[job.status]
  const open = job.status === 'planned' || job.status === 'ongoing'
  const order = { lead: 0, driver: 1, crew: 2, helper: 3 }

  async function confirmCancel() {
    setBusy(true)
    const res = await cancelJob(job!.id, reason)
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "Couldn't cancel.")
    toast.success(res.notReached?.length ? `Cancelled. Call ${res.notReached.join(', ')}: the push didn't reach them.` : 'Cancelled. The crew was notified.')
    onChanged()
  }

  return (
    <Drawer isOpen onClose={onClose} title={job.is_vip ? `VIP · ${job.client_name}` : job.client_name} subtitle={job.project_name ?? undefined}
      headerExtra={<Badge tone={status.tone} dot>{status.label}</Badge>}
      footer={open && !readOnly ? (cancelling ? (
        <>
          <Button variant="ghost" onClick={() => setCancelling(false)} disabled={busy}>Keep the job</Button>
          <Button variant="danger" loading={busy} onClick={confirmCancel}>Cancel job</Button>
        </>
      ) : (
        <>
          <Button variant="ghost" icon={Ban} onClick={() => setCancelling(true)}>Cancel job</Button>
          <Button variant="primary" icon={Pencil} onClick={() => onEdit(job)}>Change</Button>
        </>
      )) : undefined}>
      <div className="flex flex-col gap-section">
        <section className="flex flex-col gap-2 text-small">
          <p className="flex items-start gap-2 text-ink-2"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />{job.address} · circle {job.site_radius_m} m</p>
          <p className="text-ink">{dateRange(job.start_date, job.end_date)}, {clock(job.start_time)}–{clock(job.end_time)}</p>
          <p className="flex items-center gap-2 text-ink-2">
            {job.report_to === 'hq' ? <Building2 className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
            {job.report_to === 'hq' ? 'Report to the office first' : 'Go straight to the site'}
          </p>
          {job.notes && <p className="rounded-control bg-surface-soft px-3 py-2 text-ink-2">{job.notes}</p>}
          {job.status === 'cancelled' && job.cancel_reason && <p className="rounded-control bg-danger-soft px-3 py-2 text-danger">Cancelled: {job.cancel_reason}</p>}
        </section>

        {cancelling && (
          <Field label="Why is it cancelled?" htmlFor="cancel-reason" required error={error} hint="The crew sees this in their push.">
            <Input id="cancel-reason" value={reason} onChange={(e) => { setReason(e.target.value); setError(null) }} placeholder="Client postponed the visit" autoFocus />
          </Field>
        )}

        <section>
          <h3 className="mb-2 text-small font-medium text-ink">Crew</h3>
          <ul className="flex flex-col gap-2">
            {[...job.members].sort((a, b) => order[a.role] - order[b.role]).map((m) => {
              const v = vehicles.find((x) => x.id === m.vehicle_id)
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  <span className="flex-1 text-small text-ink">{m.name}{m.temp_worker_id && <span className="text-ink-3"> · no app</span>}</span>
                  {v && <span className="flex items-center gap-1 text-caption text-ink-3"><Truck className="size-3.5" aria-hidden />{v.plate}</span>}
                  <Badge tone={m.role === 'lead' ? 'info' : 'neutral'}>{m.is_acting_lead ? 'Acting lead' : ROLE_LABEL[m.role]}</Badge>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-small font-medium text-ink">History</h3>
          {!events ? <SkeletonText lines={3} /> : events.length === 0 ? <p className="text-caption text-ink-3">Nothing yet.</p> : (
            <ol className="flex flex-col gap-2">
              {events.map((e) => (
                <li key={e.id} className="text-small">
                  <span className="text-ink">{EVENT_LABEL[e.kind] ?? e.kind}{e.who ? `: ${e.who}` : ''}</span>
                  <span className="text-caption text-ink-3"> · {formatAgo(e.at)}{e.by && e.kind !== 'arrived' && e.kind !== 'done' ? ` by ${e.by}` : ''}</span>
                  {e.reason && <span className="block text-caption text-ink-2">{e.reason}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Drawer>
  )
}
