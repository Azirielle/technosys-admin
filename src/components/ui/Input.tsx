// Input and Textarea: soft grey text boxes. Wrap them in <Field> to add a label.
import type { LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from './cx'
import { FIELD_CLASSES } from './Field'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Icon shown inside the box on the left, e.g. Search. */
  icon?: LucideIcon
  size?: 'sm' | 'md'
  invalid?: boolean
}

export function Input({ icon: Icon, size = 'md', invalid, className, ...rest }: InputProps) {
  const height = size === 'sm' ? 'h-control-sm' : 'h-control'
  if (!Icon) {
    return <input aria-invalid={invalid || undefined} className={cx(FIELD_CLASSES, height, 'px-3.5', className)} {...rest} />
  }
  return (
    <div className={cx('relative', className)}>
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input aria-invalid={invalid || undefined} className={cx(FIELD_CLASSES, height, 'pl-10 pr-3.5')} {...rest} />
    </div>
  )
}

export function Textarea({
  invalid,
  className,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(FIELD_CLASSES, 'px-3.5 py-2.5 resize-y min-h-20', className)}
      {...rest}
    />
  )
}
