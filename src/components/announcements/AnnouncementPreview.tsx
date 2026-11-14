// AnnouncementPreview: roughly how an announcement looks in the staff's notice feed.
import { Megaphone } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui'
import { audienceLabel, priorityOf, type AnnouncementAudience, type AnnouncementPriority } from './types'

export function AnnouncementPreview({
  title,
  content,
  priority,
  audience,
  authorName,
  authorRole,
}: {
  title: string
  content: string
  priority: AnnouncementPriority
  audience: AnnouncementAudience
  authorName: string
  authorRole: string
}) {
  const p = priorityOf(priority)
  return (
    <div className="rounded-card bg-surface-soft p-4">
      <p className="mb-3 flex items-center gap-1.5 text-caption text-ink-3">
        <Megaphone className="size-3.5" aria-hidden /> Preview · {audienceLabel(audience)}
      </p>
      <div className="rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2.5">
          <Avatar name={authorName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-small font-medium text-ink">{authorName}</p>
            <p className="text-caption text-ink-3">{authorRole} · just now</p>
          </div>
          {priority !== 'normal' && <Badge tone={p.tone}>{p.label}</Badge>}
        </div>
        <p className="mt-3 text-heading font-semibold text-ink">{title || 'Your headline'}</p>
        <p className="mt-1 whitespace-pre-wrap text-small text-ink-2">{content || 'Your message shows here.'}</p>
      </div>
    </div>
  )
}
