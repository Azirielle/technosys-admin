// Card and CardHeader: the white rounded box with a soft shadow that holds everything on a page.
import type { ElementType, ReactNode } from 'react'
import { cx } from './cx'

export function Card({
  padded = true,
  as: Tag = 'section',
  className,
  children,
}: {
  /** false when the content (a table, a list) touches the card edges. */
  padded?: boolean
  as?: ElementType
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={cx('rounded-card bg-surface shadow-card', padded && 'p-card', className)}>
      {children}
    </Tag>
  )
}

/** Title row of a card, with an optional action (button or link) on the right. */
export function CardHeader({
  title,
  subtitle,
  count,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  count?: number
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-heading font-semibold text-ink">
          {title}
          {typeof count === 'number' && <span className="ml-2 font-medium text-ink-3 tabular-nums">{count}</span>}
        </h2>
        {subtitle && <p className="mt-0.5 text-small text-ink-2">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-inline">{action}</div>}
    </div>
  )
}
