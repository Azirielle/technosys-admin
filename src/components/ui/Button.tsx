// Button, ButtonLink and IconButton: every clickable action in the admin.
'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'approve' | 'decline'
export type ButtonSize = 'sm' | 'md' | 'lg'

// Every state shows: hover (colour), pressed (shrinks a little), keyboard focus (ring), disabled (faded), loading (spinner)
const BASE =
  'inline-flex items-center justify-center gap-inline rounded-pill font-medium whitespace-nowrap select-none ' +
  'transition-[color,background-color,box-shadow,transform,opacity] duration-150 cursor-pointer active:scale-[0.97] ' +
  'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 motion-reduce:active:scale-100 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-action text-on-action hover:bg-action-hover',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-hover',
  ghost: 'bg-transparent text-ink-2 hover:bg-surface-soft hover:text-ink',
  danger: 'bg-danger-solid text-white hover:opacity-90',
  // Approve / Decline pairs: green and red at a glance, readable in light and dark
  approve: 'bg-success-soft text-success ring-1 ring-inset ring-success/40 hover:ring-success',
  decline: 'bg-danger-soft text-danger ring-1 ring-inset ring-danger/40 hover:ring-danger',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-3.5 text-caption',
  md: 'h-control px-4.5 text-small',
  lg: 'h-control-lg px-6 text-body',
}

/** Classes for anything that should look like a button (used by Button and ButtonLink). */
export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) {
  return cx(BASE, VARIANTS[variant], SIZES[size], className)
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  fullWidth?: boolean
}

/** Default is "secondary". Use one "primary" per screen area for the main action. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading: explicitLoading = false,
  fullWidth = false,
  type = 'button',
  className,
  children,
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  const [asyncLoading, setAsyncLoading] = useState(false)
  const loading = explicitLoading || asyncLoading
  const iconSize = size === 'lg' ? 'size-4.5' : 'size-4'

  const handleClick = onClick
    ? (e: MouseEvent<HTMLButtonElement>) => {
        const ret: unknown = onClick(e)
        if (ret && typeof (ret as Promise<unknown>).then === 'function') {
          setAsyncLoading(true)
          Promise.resolve(ret).finally(() => setAsyncLoading(false))
        }
      }
    : undefined

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, cx(fullWidth && 'w-full', className))}
      onClick={handleClick}
      {...rest}
    >
      {loading ? <Loader2 className={cx(iconSize, 'animate-spin')} aria-hidden /> : Icon && <Icon className={iconSize} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className={iconSize} aria-hidden />}
    </button>
  )
}

/** A link that looks like a button (goes to another page). */
export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className,
  children,
}: {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </Link>
  )
}

/** Round button with only an icon. `label` is required so screen readers can name it. */
export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  loading: explicitLoading = false,
  disabled,
  onClick,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}) {
  const [asyncLoading, setAsyncLoading] = useState(false)
  const loading = explicitLoading || asyncLoading
  const box = { sm: 'size-control-sm', md: 'size-control', lg: 'size-control-lg' }[size]

  const handleClick = onClick
    ? (e: MouseEvent<HTMLButtonElement>) => {
        const ret: unknown = onClick(e)
        if (ret && typeof (ret as Promise<unknown>).then === 'function') {
          setAsyncLoading(true)
          Promise.resolve(ret).finally(() => setAsyncLoading(false))
        }
      }
    : undefined

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(BASE, VARIANTS[variant], box, 'p-0', className)}
      onClick={handleClick}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Icon className="size-4" aria-hidden />}
    </button>
  )
}
