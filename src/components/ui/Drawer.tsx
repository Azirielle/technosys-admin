// Drawer: a panel that slides in from the right for longer forms or details (a ticket, an employee's 201 file).
'use client'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button'
import { cx } from './cx'
import { useOverlay } from './useOverlay'

const WIDTH = { md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' }

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'lg',
  footer,
  headerExtra,
  className,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  width?: keyof typeof WIDTH
  /** Buttons pinned to the bottom. Put the main action last. */
  footer?: ReactNode
  headerExtra?: ReactNode
  className?: string
  children: ReactNode
}) {
  const mounted = useOverlay(isOpen, onClose)
  if (!isOpen || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex justify-end bg-scrim p-3 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        className={cx(
          'flex h-full w-full flex-col overflow-hidden rounded-modal bg-surface text-ink shadow-overlay animate-smooth-slide-in',
          WIDTH[width],
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-heading font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-small text-ink-2">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-inline">
            {headerExtra}
            <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-inline border-t border-line px-6 py-4">{footer}</div>}
      </aside>
    </div>,
    document.body,
  )
}
