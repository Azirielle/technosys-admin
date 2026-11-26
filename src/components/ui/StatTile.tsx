// StatTile and StatRow: one big number with a label (e.g. "Timed in 14 of 18"). Links to where you act on it.
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Tone } from './Badge'
import { cx } from './cx'
import { Skeleton } from './Skeleton'

const HINT: Record<Tone, string> = {
  neutral: 'text-ink-2',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

export function StatTile({
  label,
  value,
  total,
  hint,
  tone = 'neutral',
  icon: Icon,
  href,
  onClick,
  className,
  loading = false,
}: {
  label: string
  value: ReactNode
  /** True until the number is known: shows a grey block instead of a misleading 0. */
  loading?: boolean
  /** Shown small after the value: 14 / 18. */
  total?: ReactNode
  hint?: ReactNode
  /** Colours the hint only. */
  tone?: Tone
  icon?: LucideIcon
  href?: string
  /** Instead of href: show something on this page (e.g. the list behind the number). */
  onClick?: () => void
  className?: string
}) {
  const body = (
    <div
      className={cx(
        'h-full rounded-card bg-surface px-3.5 py-2 shadow-card transition-shadow flex flex-col justify-between',
        (href || onClick) && 'hover:shadow-raised',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-caption font-medium text-ink-2">{label}</span>
        {Icon && (
          <span className="flex size-5.5 shrink-0 items-center justify-center rounded-pill bg-surface-soft text-ink-2">
            <Icon className="size-3" aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-0.5">
          <Skeleton className="h-5 w-12" />
          {hint && <Skeleton className="mt-0.5 h-2.5 w-20" />}
        </div>
      ) : (
        <div className="mt-0.5">
          <div className="text-heading font-semibold text-ink tabular-nums leading-tight">
            {value}
            {total !== undefined && <span className="ml-0.5 text-micro font-medium text-ink-3">/{total}</span>}
          </div>
          {hint && <p className={cx('truncate text-micro font-medium leading-tight', HINT[tone])} title={typeof hint === 'string' ? hint : undefined}>{hint}</p>}
        </div>
      )}
    </div>
  )
  if (onClick) return (
    <button type="button" onClick={onClick} className="block w-full cursor-pointer rounded-card text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      {body}
    </button>
  )
  if (!href) return body
  return (
    <Link href={href} className="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      {body}
    </Link>
  )
}

/** Lays StatTiles out in a row of up to four (fewer on small screens). */
export function StatRow({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</section>
}
