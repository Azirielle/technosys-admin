// WorkTypeBadge: plain badge showing one of the 4 kinds of work (B6)
// On-site (info), Out-of-town (warning), Head office (VIP) (success), In-house (neutral).
import { Badge, type Tone } from '@/components/ui'
import { Briefcase, Building2, MapPin, Truck, type LucideIcon } from 'lucide-react'
import type { WorkType } from './jobTypes'

export const WORK_TYPE_META: Record<
  WorkType,
  { label: string; tone: Tone; icon: LucideIcon }
> = {
  on_site: { label: 'On-site', tone: 'info', icon: MapPin },
  in_house: { label: 'In-house', tone: 'neutral', icon: Briefcase },
  out_of_town: { label: 'Out-of-town', tone: 'warning', icon: Truck },
  office: { label: 'Head office (VIP)', tone: 'success', icon: Building2 },
}

export function WorkTypeBadge({
  workType,
  className,
}: {
  workType?: WorkType | string | null
  className?: string
}) {
  const meta = WORK_TYPE_META[(workType as WorkType) || 'on_site'] ?? WORK_TYPE_META.on_site
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {meta.label}
    </Badge>
  )
}
