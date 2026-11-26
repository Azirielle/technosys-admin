// Skeleton: grey placeholder blocks shown while a page or list loads, shaped like what is coming.
// They pulse softly; with "reduce motion" turned on they stay still.
import type { ReactNode } from 'react'
import { cx } from './cx'
import { TableBody, TableCell, TableContainer, TableHead, TableRow } from './DataTable'

/** One grey block. Size it with className (e.g. "h-4 w-32"). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx('block rounded-chip bg-surface-soft motion-safe:animate-pulse', className)} />
}

/** Wraps a loading area so screen readers hear "Loading" once instead of reading the grey blocks. */
export function SkeletonArea({ label = 'Loading', className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  )
}

/** A few lines of text; the last one shorter. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

/** Title and subtitle, like PageHeader. */
export function SkeletonPageHeader({ actions = true }: { actions?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {actions && <Skeleton className="h-control w-32 rounded-pill" />}
    </div>
  )
}

/** One StatTile-shaped card. */
export function SkeletonStatTile() {
  return (
    <div className="rounded-card bg-surface px-3.5 py-2 shadow-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="size-5.5 rounded-pill" />
      </div>
      <Skeleton className="mt-1 h-5 w-12" />
      <Skeleton className="mt-0.5 h-2.5 w-20" />
    </div>
  )
}

/** A row of StatTile-shaped cards (same grid as StatRow). */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => <SkeletonStatTile key={i} />)}
    </div>
  )
}

/** Tabs or filter pills. */
export function SkeletonTabs({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-9 w-24 rounded-pill" />)}
    </div>
  )
}

const CELL_WIDTHS = ['w-40', 'w-24', 'w-32', 'w-16', 'w-20', 'w-28', 'w-12']

/** Rows to put inside an existing TableBody while it loads. */
export function SkeletonTableRows({ rows = 5, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <TableCell key={c}>
              {c === 0 ? (
                <span className="flex items-center gap-2.5">
                  {r === 0 && <span className="sr-only">Loading…</span>}
                  <Skeleton className="size-6 shrink-0 rounded-pill" />
                  <Skeleton className="h-4 w-36" />
                </span>
              ) : (
                <Skeleton className={cx('h-4', CELL_WIDTHS[c % CELL_WIDTHS.length])} />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

/** A whole table card: grey header strip and rows. */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <TableContainer>
      <table className="w-full">
        <TableHead>
          <tr>
            {Array.from({ length: cols }, (_, c) => (
              <th key={c} className="h-10 px-4 first:pl-card last:pr-card">
                <Skeleton className="h-3 w-16 bg-line" />
              </th>
            ))}
          </tr>
        </TableHead>
        <TableBody>
          <SkeletonTableRows rows={rows} cols={cols} />
        </TableBody>
      </table>
    </TableContainer>
  )
}

/** A ListCard-shaped card with a few rows. */
export function SkeletonListCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex min-h-[220px] flex-col gap-4 rounded-card bg-surface p-card shadow-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-14" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-pill" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
