// JobFormDrawer: create or change a job in four steps with Back / Next: 1 Where (site, pin, circle) → 2 When (dates,
// times, how they report) → 3 Who (lead, crew, driver + vehicle; the database's save checks run as people are picked,
// red rows block) → 4 Check & save (summary, notes, reason when changing). Next checks that step's answers first.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveJob } from '@/app/actions/jobs'
import { Button, Drawer, Field, Input, Select, Steps, Textarea, useToast } from '@/components/ui'
import { JobSiteFields, type SiteValue } from './JobSiteFields'
import { JobCrewFields, type CrewValue } from './JobCrewFields'
import { JobChecksList } from './JobChecksList'
import { runSaveChecks } from './jobsData'
import { REPORT_TO, WORK_TYPES, clock, dateRange, manilaToday, type Job, type JobInput, type Office, type Person, type SaveCheck, type TempWorker, type Vehicle } from './jobTypes'

type Props = { open: boolean; job: Job | null; prefill?: Partial<JobInput>; people: Person[]; temps: TempWorker[]; vehicles: Vehicle[]; offices: Office[]; onClose: () => void; onSaved: () => void }

function fromJob(job: Job | null, hq: Office | undefined, prefill: Partial<JobInput> = {}): JobInput {
  const m = (role: string) => job?.members.filter((x) => x.role === role && x.person_id).map((x) => x.person_id!) ?? []
  const driver = job?.members.find((x) => x.role === 'driver')
  return {
    client_name: job?.client_name ?? '', address: job?.address ?? '', project_name: job?.project_name ?? '', notes: job?.notes ?? '',
    site_lat: job?.site_lat ?? hq?.latitude ?? 14.3439, site_lon: job?.site_lon ?? hq?.longitude ?? 121.0617, site_radius_m: job?.site_radius_m ?? 150,
    start_date: job?.start_date ?? manilaToday(), end_date: job?.end_date ?? manilaToday(),
    start_time: job?.start_time.slice(0, 5) ?? '08:00', end_time: job?.end_time.slice(0, 5) ?? '17:00',
    work_type: job?.work_type ?? 'on_site', report_to: job?.report_to ?? 'site', hq_office_id: job?.hq_office_id ?? hq?.id ?? null,
    lead_id: m('lead')[0] ?? '', crew_ids: m('crew'), helper_ids: m('helper'),
    driver_id: driver?.person_id ?? null, vehicle_id: driver?.vehicle_id ?? null,
    temp_worker_ids: job?.members.filter((x) => x.temp_worker_id).map((x) => x.temp_worker_id!) ?? [],
    change_reason: '',
    // A new job started from the Scheduling board: the person, day and time already picked
    ...(job ? {} : prefill),
  }
}

export function JobFormDrawer({ open, job, prefill, people, temps, vehicles, offices, onClose, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [form, setForm] = useState<JobInput>(() => fromJob(job, offices[0], prefill))
  const [pinned, setPinned] = useState(!!job)
  const [checks, setChecks] = useState<SaveCheck[] | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  // A fresh form each time the drawer opens for a job (or a new one)
  const [openedFor, setOpenedFor] = useState<string | null | undefined>(undefined)
  const key = open ? job?.id ?? `new-${JSON.stringify(prefill ?? {})}` : undefined
  if (key !== openedFor) { setOpenedFor(key); setForm(fromJob(job, offices[0], prefill)); setPinned(!!job); setChecks(null); setError(null); setStep(1) }

  const set = (patch: Partial<JobInput>) => { setForm((f) => ({ ...f, ...patch })); setError(null) }
  const personIds = [form.lead_id, ...form.crew_ids, ...form.helper_ids, form.driver_id].filter(Boolean) as string[]

  // Save checks, half a second after the last change to the people, dates, times or vehicle
  const checkKey = JSON.stringify([personIds, form.start_date, form.end_date, form.start_time, form.end_time, form.vehicle_id])
  useEffect(() => {
    if (!open || personIds.length === 0) { setChecks(null); return }
    setChecking(true)
    const t = setTimeout(() => {
      runSaveChecks(supabase, { personIds, startDate: form.start_date, endDate: form.end_date, startTime: form.start_time, endTime: form.end_time, vehicleId: form.vehicle_id, excludeJobId: job?.id })
        .then(setChecks).catch(() => setChecks(null)).finally(() => setChecking(false))
    }, 500)
    return () => clearTimeout(t)
  }, [checkKey, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const extra = [
    ...(form.report_to === 'hq' && !form.driver_id ? ['Who drives? This job reports to the office first.'] : []),
  ]
  const blocked = (checks ?? []).some((c) => c.blocking)

  async function submit() {
    if (!pinned) return setError('Place the pin on the map.')
    setSaving(true)
    const res = await saveJob(form, job?.id)
    setSaving(false)
    if (!res.ok) return setError(res.error)
    const total = personIds.length
    toast.success(res.notReached.length ? `Saved. ${res.notReached.join(', ')} didn't get the push: call them.` : `Saved. ${total} ${total === 1 ? 'person' : 'people'} notified.`)
    onSaved()
  }

  // What each step still needs before Next (null = ready)
  const missing = (n: number): string | null => {
    if (n === 1) return !form.client_name.trim() ? 'Enter the client.' : !form.address.trim() ? 'Enter the address.' : !pinned ? 'Place the pin on the map.' : null
    if (n === 2) return !(form.start_date && form.end_date && form.start_time && form.end_time) ? 'Enter the days and times.' : form.end_time <= form.start_time ? 'The end time must be after the start.' : null
    if (n === 3) return !form.lead_id ? 'Pick the lead.' : checking ? 'Checking the crew…' : blocked ? 'Fix the red rows first.' : null
    return null
  }
  const STEPS = ['Where', 'When', 'Who', 'Check & save']
  const next = () => { const m = missing(step); if (m) return setError(m); setError(null); setStep(step + 1) }
  // A step can be opened when every step before it is ready
  const goTo = (n: number) => { if (n < step || [1, 2, 3].slice(0, n - 1).every((i) => !missing(i))) { setError(null); setStep(n) } }
  const name = (id: string | null) => people.find((x) => x.id === id)?.full_name

  const site: SiteValue = form
  const crew: CrewValue = form

  return (
    <Drawer isOpen={open} onClose={onClose} width="xl" title={job ? `Change: ${job.client_name}` : 'New job'}
      subtitle="The crew gets a push when you save."
      footer={
        <>
          {/* Shown here, beside Save, so it's seen even when the form is scrolled */}
          {error && <p role="alert" className="mr-auto max-w-md text-small text-danger">{error}</p>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {step > 1 && <Button variant="secondary" icon={ArrowLeft} onClick={() => { setError(null); setStep(step - 1) }}>Back</Button>}
          {step < STEPS.length
            ? <Button variant="primary" icon={ArrowRight} onClick={next}>Next</Button>
            : <Button variant="primary" icon={Save} loading={saving} disabled={blocked || checking} onClick={submit}>{job ? 'Save changes' : 'Save job'}</Button>}
        </>
      }>
      <div className="flex flex-col gap-section">
        <div className="sticky top-0 z-10 -mx-1 -mt-1 bg-surface px-1 pb-3 pt-1">
          <Steps steps={STEPS} current={step} onSelect={goTo} />
        </div>
        {step === 1 && <section className="flex flex-col gap-stack">
          <h3 className="text-small font-medium text-ink">Where</h3>
          <JobSiteFields value={site} pinned={pinned} onChange={(p) => { set(p); if (p.site_lat !== undefined) setPinned(true) }} />
        </section>}

        {step === 2 && <section className="flex flex-col gap-stack">
          <h3 className="text-small font-medium text-ink">When</h3>
          <div className="grid grid-cols-2 gap-stack sm:grid-cols-4">
            <Field label="First day" htmlFor="job-start-date" required><Input id="job-start-date" type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value, end_date: form.end_date < e.target.value ? e.target.value : form.end_date })} /></Field>
            <Field label="Last day" htmlFor="job-end-date" required><Input id="job-end-date" type="date" min={form.start_date} value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} /></Field>
            <Field label="Start" htmlFor="job-start-time" required><Input id="job-start-time" type="time" value={form.start_time} onChange={(e) => set({ start_time: e.target.value })} /></Field>
            <Field label="End" htmlFor="job-end-time" required><Input id="job-end-time" type="time" value={form.end_time} onChange={(e) => set({ end_time: e.target.value })} /></Field>
          </div>
          <p className="text-caption text-ink-3">Time-in opens 1 hour before the start. Late after 15 minutes. Same hours every day of the job.</p>
          <h3 className="mt-2 text-small font-medium text-ink">How they report</h3>
          <div className="grid grid-cols-1 gap-stack sm:grid-cols-2">
            <Field label="Kind of work" htmlFor="job-type"><Select id="job-type" value={form.work_type} onChange={(e) => set({ work_type: e.target.value as JobInput['work_type'] })} options={WORK_TYPES} /></Field>
            <Field label="Report to" htmlFor="job-report" hint={REPORT_TO.find((r) => r.value === form.report_to)?.hint}>
              <Select id="job-report" value={form.report_to} onChange={(e) => set({ report_to: e.target.value as JobInput['report_to'] })} options={REPORT_TO} />
            </Field>
          </div>
          {form.report_to === 'hq' && offices.length > 1 && (
            <Field label="Office" htmlFor="job-office"><Select id="job-office" value={form.hq_office_id ?? ''} onChange={(e) => set({ hq_office_id: e.target.value })} options={offices.map((o) => ({ value: o.id, label: o.name }))} /></Field>
          )}
        </section>}

        {step === 3 && <section className="flex flex-col gap-stack">
          <h3 className="text-small font-medium text-ink">Who</h3>
          <JobCrewFields value={crew} onChange={set} people={people} temps={temps} vehicles={vehicles} needsDriver={form.report_to === 'hq'} />
          <JobChecksList checks={checks} checking={checking} extra={extra} />
        </section>}

        {step === 4 && <section className="flex flex-col gap-stack">
          <h3 className="text-small font-medium text-ink">Check & save</h3>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 rounded-card bg-surface-soft p-card-sm text-small">
            <dt className="text-ink-3">Where</dt><dd className="text-ink">{form.client_name} · {form.address}</dd>
            <dt className="text-ink-3">When</dt><dd className="text-ink">{dateRange(form.start_date, form.end_date)}, {clock(form.start_time)} – {clock(form.end_time)}</dd>
            <dt className="text-ink-3">Report to</dt><dd className="text-ink">{REPORT_TO.find((r) => r.value === form.report_to)?.label}</dd>
            <dt className="text-ink-3">Lead</dt><dd className="text-ink">{name(form.lead_id) ?? '—'}</dd>
            <dt className="text-ink-3">Others</dt><dd className="text-ink">{[...form.crew_ids, ...form.helper_ids].map(name).filter(Boolean).join(', ') || 'None'}{form.driver_id ? ` · Driver: ${name(form.driver_id)}` : ''}{form.temp_worker_ids.length ? ` · ${form.temp_worker_ids.length} temporary` : ''}</dd>
          </dl>
          <JobChecksList checks={checks} checking={checking} extra={extra} />
        <Field label="Notes for the crew (optional)" htmlFor="job-notes"><Textarea id="job-notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Bring the ladder. Gate pass at the guard house." /></Field>
        {job && (
          <Field label="Why is it changing?" htmlFor="job-reason" required hint="The crew sees this in their push and in the app.">
            <Input id="job-reason" value={form.change_reason} onChange={(e) => set({ change_reason: e.target.value })} placeholder="Client moved the visit to Thursday" />
          </Field>
        )}
        </section>}
      </div>
    </Drawer>
  )
}
