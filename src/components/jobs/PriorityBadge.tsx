// PriorityBadge: a job's priority level (Low / Medium / High); a VIP squeeze-in always shows as Urgent.
import { Badge } from '@/components/ui'
import { PRIORITY, type Job } from './jobTypes'

export function PriorityBadge({ job }: { job: Pick<Job, 'priority' | 'is_vip'> }) {
  const p = job.is_vip ? { label: 'Urgent', tone: 'danger' as const } : PRIORITY[job.priority]
  return <Badge tone={p.tone}>{p.label}</Badge>
}
