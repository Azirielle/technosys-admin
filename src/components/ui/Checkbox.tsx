// Checkbox: a tick box with its label, for checklists and yes/no settings.
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export function Checkbox({
  label,
  hint,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5 text-small text-ink', className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-chip accent-[var(--tc-action)]" {...rest} />
      <span>
        {label}
        {hint && <span className="block text-caption text-ink-3">{hint}</span>}
      </span>
    </label>
  )
}
