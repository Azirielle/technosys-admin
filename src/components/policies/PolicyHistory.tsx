// PolicyHistory: the real dates in this policy's life — created, sent for approval, published, archived.
import type { CompanyPolicy } from '@/app/actions/policies'
import { formatDay, formatTime } from '@/lib/format'
import { cx } from '@/components/ui'

function when(iso: string) {
  return `${formatDay(iso)}, ${formatTime(iso)}`
}

export function PolicyHistory({ policy }: { policy: CompanyPolicy }) {
  const steps = [
    { label: `Created ${policy.version}`, at: policy.created_at, done: true },
    { label: 'Published', at: policy.published_at, done: Boolean(policy.published_at) },
    { label: 'Archived', at: policy.archived_at, done: Boolean(policy.archived_at) },
  ].filter((s) => s.done && s.at)

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col">
        {steps.map((s, i) => (
          <li key={s.label} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span className={cx('mt-1.5 size-2.5 rounded-pill', i === steps.length - 1 ? 'bg-action' : 'bg-line-strong')} />
              {i < steps.length - 1 && <span className="w-px flex-1 bg-line" />}
            </span>
            <span className="pb-4">
              <span className="block text-small font-medium text-ink">{s.label}</span>
              <span className="block text-caption text-ink-3">{when(s.at!)}</span>
            </span>
          </li>
        ))}
      </ol>
      <dl className="flex flex-col gap-1 text-caption text-ink-2">
        <div>Takes effect: <span className="text-ink">{policy.effective_date ? formatDay(policy.effective_date) : 'not set'}</span></div>
        {policy.is_material_change && <div>Marked as a big change: everyone signs again.</div>}
        {policy.parent_policy_id && <div>This is a revision of an earlier version.</div>}
      </dl>
      {policy.review_notes && (
        <div className="rounded-control bg-surface-soft p-3 text-small text-ink-2">
          <p className="mb-1 text-caption font-medium text-ink-3">Latest review notes</p>
          <p className="whitespace-pre-wrap">{policy.review_notes}</p>
        </div>
      )}
    </div>
  )
}
