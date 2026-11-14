// ListCard and ListRow: a card with a title and a short list (e.g. "Leave waiting" on an overview).
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Children, type ReactNode } from 'react'
import { Card, CardHeader } from './Card'
import { cx } from './cx'

export function ListCard({
  title,
  count,
  href,
  linkLabel = 'Open',
  empty,
  className,
  children,
}: {
  title: string
  count?: number
  /** Page where you act on these rows. Shows an "Open →" link. */
  href?: string
  linkLabel?: string
  /** Sentence shown when there are no rows. */
  empty: string
  className?: string
  children?: ReactNode
}) {
  const hasRows = Children.toArray(children).length > 0
  return (
    <Card padded={false} className={cx('flex min-h-[220px] flex-col', className)}>
      <CardHeader
        className="px-card pt-card pb-3"
        title={title}
        count={count}
        action={
          href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-pill text-small font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {linkLabel} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )
        }
      />
      {hasRows ? (
        <ul className="divide-y divide-line border-t border-line pb-1">{children}</ul>
      ) : (
        <p className="flex flex-1 items-center justify-center px-card pb-card text-center text-small text-ink-3">{empty}</p>
      )}
    </Card>
  )
}

export function ListRow({
  primary,
  secondary,
  right,
  badge,
  leading,
}: {
  primary: ReactNode
  secondary?: ReactNode
  right?: ReactNode
  badge?: ReactNode
  /** Something on the left, usually an <Avatar>. */
  leading?: ReactNode
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-card py-3">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-small font-medium text-ink">{primary}</span>
            {badge}
          </div>
          {secondary && <p className="mt-0.5 truncate text-caption text-ink-2">{secondary}</p>}
        </div>
      </div>
      {right && <div className="shrink-0 text-caption text-ink-2 tabular-nums">{right}</div>}
    </li>
  )
}
