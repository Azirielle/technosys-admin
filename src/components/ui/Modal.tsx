// Modal: a centred box over the page for a short form or a confirmation ("Approve this leave?").
'use client'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Tone } from './Badge'
import { IconButton } from './Button'
import { cx } from './cx'
import { useOverlay } from './useOverlay'

const WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
}

const ICON_TONE: Record<Tone, string> = {
  neutral: 'bg-surface-soft text-ink',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
}

// Older pages pass colour names; map them to tones.
const OLD_ICON_VARIANT: Record<string, Tone> = { default: 'neutral', blue: 'info', emerald: 'success', rose: 'danger', amber: 'warning' }

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  iconTone?: Tone
  /** @deprecated use iconTone */
  iconVariant?: 'blue' | 'emerald' | 'rose' | 'amber' | 'default'
  /** Shown where the icon goes instead of an icon, e.g. a person's Avatar. */
  leading?: ReactNode
  maxWidth?: keyof typeof WIDTH
  /** Tailwind height class for the box, e.g. "h-[80vh]". */
  contentHeight?: string
  /** Buttons at the bottom. Put the main action last. */
  footer?: ReactNode
  headerExtra?: ReactNode
  className?: string
  zIndex?: string
  children: ReactNode
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconTone,
  iconVariant = 'default',
  leading,
  maxWidth = 'lg',
  contentHeight,
  footer,
  headerExtra,
  className,
  zIndex = 'z-[9999]',
  children,
}: ModalProps) {
  const mounted = useOverlay(isOpen, onClose)
  if (!isOpen || !mounted) return null
  const tone = iconTone ?? OLD_ICON_VARIANT[iconVariant]

  return createPortal(
    <div
      className={cx('fixed inset-0 flex items-center justify-center bg-scrim p-4 backdrop-blur-[2px] animate-in fade-in duration-150 sm:p-6', zIndex)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'flex w-full flex-col overflow-hidden rounded-modal bg-surface text-ink shadow-overlay animate-in fade-in zoom-in-[0.98] duration-150',
          WIDTH[maxWidth],
          contentHeight ?? 'max-h-[calc(100dvh-2.5rem)] sm:max-h-[calc(100dvh-3rem)]',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-5 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            {leading}
            {Icon && !leading && (
              <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-pill', ICON_TONE[tone])}>
                <Icon className="size-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-heading font-semibold">{title}</h2>
              {subtitle && <p className="mt-0.5 text-small text-ink-2">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-inline">
            {headerExtra}
            <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 text-small text-ink-2 overscroll-contain">{children}</div>

        {footer && <div className="flex shrink-0 items-center justify-end gap-inline border-t border-line px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
