// OnSiteReviewStep: step 4 of a new on-site job — everything on one card before saving.
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatDisplayDate } from './types'
import type { JobPlace } from './OnSiteJobStep'
import type { JobTime } from './OnSiteTimeStep'

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-small text-ink">{children}</dd>
    </div>
  )
}

export function OnSiteReviewStep({
  place,
  time,
  leadName,
  crewCount,
  helperCount,
}: {
  place: JobPlace
  time: JobTime
  leadName: string | null
  crewCount: number
  helperCount: number
}) {
  return (
    <div className="flex flex-col gap-stack">
      <dl className="grid grid-cols-1 gap-4 rounded-control bg-surface-soft p-4 sm:grid-cols-2">
        <Item label="Job">{place.clientName || '—'}</Item>
        <Item label="Address">{place.location || 'Pacita HQ'}</Item>
        <Item label="When">{formatDisplayDate(time.date)}, {time.startTime}–{time.endTime}</Item>
        <Item label="Report to">{time.report === 'hq' ? 'Pacita HQ first' : 'Straight to the site'} · check-in within {place.radius} m</Item>
        <Item label="Lead">{leadName ?? '—'}</Item>
        <Item label="Crew">{crewCount} more {crewCount === 1 ? 'person' : 'people'}{helperCount ? ` + ${helperCount} temporary` : ''}</Item>
      </dl>
      {leadName ? (
        <p className="flex items-center gap-2 rounded-control bg-success-soft p-3 text-small text-success">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Ready to save. The crew get a notification on their phones.
        </p>
      ) : (
        <p className="flex items-center gap-2 rounded-control bg-danger-soft p-3 text-small text-danger">
          <AlertTriangle className="size-4 shrink-0" aria-hidden /> Choose who leads this job (step 3) before saving.
        </p>
      )}
    </div>
  )
}
