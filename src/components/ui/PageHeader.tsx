// Page and PageHeader: the same padding, width and title row on every admin page. The title gets a "?" (HelpButton).
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'
import { HelpButton } from '@/components/help/HelpButton'

/** Scrollable page frame. Wrap every page's content in this. */
export function Page({ wide = false, className, children }: { wide?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className="h-full min-h-0 flex-1 flex flex-col overflow-y-auto">
      <div className={cx('mx-auto flex h-full min-h-0 w-full flex-1 flex-col gap-section px-page py-page-y', wide ? 'max-w-[1440px]' : 'max-w-6xl', className)}>
        {children}
      </div>
    </div>
  )
}

export interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  /** Small text above the title, e.g. the date. */
  eyebrow?: ReactNode
  icon?: LucideIcon
  badge?: ReactNode
  /** Buttons on the right. Put the main one last. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, eyebrow, icon: Icon, badge, actions, className }: PageHeaderProps) {
  return (
    <header className={cx('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-surface text-ink shadow-card">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-caption font-medium text-ink-3">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-title font-semibold text-ink">{title}</h1>
            <HelpButton />
            {badge}
          </div>
          {subtitle && <p className="mt-1 max-w-3xl text-small text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-inline">{actions}</div>}
    </header>
  )
}

// Older pages import the default export.
export default PageHeader
