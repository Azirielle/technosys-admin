// OnSiteTimeStep: step 2 of a new on-site job — the date, the hours, and where the crew reports first.
'use client'

import { Field, Input, cx } from '@/components/ui'

export interface JobTime {
  date: string
  startTime: string
  endTime: string
  report: 'direct_dispatch' | 'hq'
}

const REPORT = [
  { value: 'direct_dispatch' as const, label: 'Straight to the site', hint: 'They time in at the customer.' },
  { value: 'hq' as const, label: 'Pacita HQ first', hint: 'They meet at the office, then go together.' },
]

export function OnSiteTimeStep({ value, onChange }: { value: JobTime; onChange: (next: JobTime) => void }) {
  const set = (patch: Partial<JobTime>) => onChange({ ...value, ...patch })
  return (
    <div className="flex flex-col gap-stack">
      <Field label="Date" htmlFor="job-date" required>
        <Input id="job-date" type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-stack">
        <Field label="Start" htmlFor="job-start" required>
          <Input id="job-start" type="time" value={value.startTime} onChange={(e) => set({ startTime: e.target.value })} />
        </Field>
        <Field label="Expected finish" htmlFor="job-end">
          <Input id="job-end" type="time" value={value.endTime} onChange={(e) => set({ endTime: e.target.value })} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-caption font-medium text-ink-2">Where do they report?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REPORT.map((r) => (
            <label key={r.value} className={cx('cursor-pointer rounded-control border p-3', value.report === r.value ? 'border-ink bg-surface-soft' : 'border-line hover:border-line-strong')}>
              <input type="radio" name="report" className="sr-only" checked={value.report === r.value} onChange={() => set({ report: r.value })} />
              <span className="block text-small font-medium text-ink">{r.label}</span>
              <span className="block text-caption text-ink-3">{r.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
