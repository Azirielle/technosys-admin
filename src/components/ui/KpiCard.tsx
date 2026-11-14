// KpiCard and KpiGrid: older names for StatTile and StatRow, kept so existing pages keep working.
// New code: import { StatTile, StatRow } from '@/components/ui'.
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, type Tone } from './Badge'
import { cx } from './cx'
import { StatTile } from './StatTile'

type OldColour = 'default' | 'blue' | 'emerald' | 'rose' | 'amber'
const TONE: Record<OldColour, Tone> = { default: 'neutral', blue: 'info', emerald: 'success', rose: 'danger', amber: 'warning' }

export interface KpiCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  subtext?: string
  badge?: string
  badgeVariant?: OldColour
  variant?: OldColour
  className?: string
}

/** @deprecated Use <StatTile>. */
export function KpiCard({ label, value, icon, subtext, badge, badgeVariant = 'default', variant = 'default', className }: KpiCardProps) {
  return (
    <StatTile
      label={label}
      icon={icon}
      tone={TONE[variant]}
      className={className}
      value={
        <span className="inline-flex items-baseline gap-2">
          {value}
          {badge && <Badge tone={TONE[badgeVariant]}>{badge}</Badge>}
        </span>
      }
      hint={subtext}
    />
  )
}

/** @deprecated Use <StatRow>. */
export function KpiGrid({ children, columns = 4, className }: { children: ReactNode; columns?: 2 | 3 | 4; className?: string }) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }
  return <div className={cx('mb-section grid grid-cols-1 gap-4', cols[columns], className)}>{children}</div>
}
