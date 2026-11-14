// EmptyState: what a page or card shows when there's nothing to list yet, with an optional next step.
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  /** Name what goes here: "No leave requests". */
  title: string
  /** One sentence: why it's empty or what to do. */
  description?: ReactNode
  /** Usually one <Button>. */
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-card py-12 text-center', className)}>
      <span className="mb-4 flex size-14 items-center justify-center rounded-pill bg-surface-soft text-ink-3">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-heading font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-small text-ink-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
