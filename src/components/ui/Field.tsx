// Field: puts a label, a hint and an error message around any input, select or textarea.
import type { ReactNode } from 'react'
import { cx } from './cx'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-caption font-medium text-ink-2">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-caption text-danger">{error}</p>
      ) : (
        hint && <p className="text-caption text-ink-3">{hint}</p>
      )}
    </div>
  )
}

/** Shared look for text inputs, textareas and selects. */
export const FIELD_CLASSES =
  'w-full rounded-control bg-surface-soft text-small text-ink placeholder:text-ink-3 ' +
  'border border-transparent transition-colors outline-none ' +
  'hover:border-line-strong focus:border-ink-3 focus:bg-surface focus-visible:ring-3 focus-visible:ring-focus/20 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-danger'
