// DataTable parts: every table in the admin is built from these (container, head, rows, cells, empty state).
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, StatusDot as Dot, type Tone } from './Badge'
import { cx } from './cx'

type Align = 'left' | 'center' | 'right'
const ALIGN: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }

/** The rounded card around a table. Scrolls sideways on small screens. */
export function TableContainer({ children, className, maxHeight }: { children: ReactNode; className?: string; maxHeight?: string }) {
  return (
    <div
      style={maxHeight ? { maxHeight } : undefined}
      className={cx('overflow-auto rounded-card bg-surface shadow-card', className)}
    >
      {children}
    </div>
  )
}

export function Table({ children, className, fixed = false }: { children: ReactNode; className?: string; fixed?: boolean }) {
  return <table className={cx('w-full border-collapse text-left', fixed && 'table-fixed', className)}>{children}</table>
}

export function TableHead({ children, className, sticky = false }: { children: ReactNode; className?: string; sticky?: boolean }) {
  return <thead className={cx('bg-surface-soft', sticky && 'sticky top-0 z-10', className)}>{children}</thead>
}

/** Column title. `numeric` right-aligns it to sit over numbers. */
export function TableHeaderCell({
  children,
  className,
  align = 'left',
  numeric = false,
  width,
}: {
  children?: ReactNode
  className?: string
  align?: Align
  numeric?: boolean
  width?: string
  /** Kept for older pages; dividers between columns were removed in the new look. */
  noDivider?: boolean
}) {
  return (
    <th
      style={width ? { width } : undefined}
      className={cx('h-10 px-4 text-caption font-medium text-ink-2 whitespace-nowrap first:pl-card last:pr-card', ALIGN[numeric ? 'right' : align], className)}
    >
      {children}
    </th>
  )
}

export function TableBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cx('divide-y divide-line', className)}>{children}</tbody>
}

export function TableRow({
  children,
  className,
  onClick,
  selected = false,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
}) {
  return (
    <tr
      onClick={onClick}
      className={cx(
        'group h-12 transition-colors duration-75',
        onClick && 'cursor-pointer',
        selected ? 'bg-surface-soft' : 'hover:bg-surface-hover',
        className,
      )}
    >
      {children}
    </tr>
  )
}

/** One cell. `numeric` right-aligns and uses even-width digits; `mono` is for IDs and serial numbers. */
export function TableCell({
  children,
  className,
  align = 'left',
  numeric = false,
  mono = false,
  colSpan,
}: {
  children?: ReactNode
  className?: string
  align?: Align
  numeric?: boolean
  mono?: boolean
  colSpan?: number
  /** Kept for older pages; no effect. */
  noDivider?: boolean
}) {
  return (
    <td
      colSpan={colSpan}
      className={cx(
        'px-4 py-2 text-small text-ink first:pl-card last:pr-card',
        numeric && 'tabular-nums',
        mono && 'font-mono text-caption whitespace-nowrap text-ink-2',
        ALIGN[numeric ? 'right' : align],
        className,
      )}
    >
      {children}
    </td>
  )
}

/** Row shown when a table has nothing to list. */
export function TableEmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = 'Try a different search or filter.',
  colSpan = 10,
  className,
}: {
  icon?: LucideIcon
  title?: string
  description?: string
  colSpan?: number
  className?: string
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cx('px-card py-12 text-center', className)}>
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-pill bg-surface-soft text-ink-3">
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="text-small font-medium text-ink">{title}</p>
        <p className="mx-auto mt-0.5 max-w-sm text-caption text-ink-2">{description}</p>
      </td>
    </tr>
  )
}

// ---- Older names, kept so existing pages keep working while they move to Badge ----

const OLD_TONE: Record<string, Tone> = {
  active: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  neutral: 'neutral',
  purple: 'info',
}

/** @deprecated Use <StatusDot tone="…"> from Badge.tsx. */
export function StatusDot({
  status,
  label,
  title,
  className,
}: {
  status: 'active' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'
  label: ReactNode
  icon?: LucideIcon
  title?: string
  className?: string
}) {
  return (
    <span title={title}>
      <Dot tone={OLD_TONE[status]} className={className}>{label}</Dot>
    </span>
  )
}

/** @deprecated Use <Badge> from Badge.tsx. */
export function MutedBadge({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return <Badge className={className} title={title}>{children}</Badge>
}
