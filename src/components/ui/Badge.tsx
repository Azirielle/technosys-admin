// Badge and StatusDot: short status words ("Pending", "Approved"). Colour supports the word, never replaces it.
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const SOFT: Record<Tone, string> = {
  neutral: 'bg-surface-soft text-ink-2',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
}

const DOT: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

/** Soft pill. Use for status columns and labels next to names. */
export function Badge({
  tone = 'neutral',
  icon: Icon,
  dot = false,
  className,
  title,
  children,
}: {
  tone?: Tone
  icon?: LucideIcon
  /** Small coloured dot before the word. */
  dot?: boolean
  className?: string
  title?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-micro font-medium whitespace-nowrap',
        SOFT[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-3" aria-hidden /> : dot && <span className={cx('size-1.5 rounded-pill', DOT[tone])} aria-hidden />}
      {children}
    </span>
  )
}

/** Quieter than a Badge: a dot and a word, no pill. Good in dense tables. */
export function StatusDot({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-caption font-medium text-ink-2 whitespace-nowrap', className)}>
      <span className={cx('size-1.5 shrink-0 rounded-pill', DOT[tone])} aria-hidden />
      {children}
    </span>
  )
}
