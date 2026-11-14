// Select: a dropdown built on the browser's own <select>, so it works with the keyboard and on phones.
import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cx } from './cx'
import { FIELD_CLASSES } from './Field'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[]
  /** Grey first choice like "All types". Leave out to force a real choice. */
  placeholder?: string
  size?: 'sm' | 'md'
  invalid?: boolean
}

export function Select({ options, placeholder, size = 'md', invalid, className, ...rest }: SelectProps) {
  return (
    <div className={cx('relative', className)}>
      <select
        aria-invalid={invalid || undefined}
        className={cx(FIELD_CLASSES, size === 'sm' ? 'h-control-sm' : 'h-control', 'appearance-none pl-3.5 pr-9 cursor-pointer')}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  )
}
