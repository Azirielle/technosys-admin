// Avatar and AvatarStack: a person's photo, or their initials when there's no photo.
import type { ReactNode } from 'react'
import { cx } from './cx'

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-micro',
  md: 'size-10 text-caption',
  lg: 'size-14 text-body',
}

export type AvatarSize = keyof typeof SIZES

/** "Juan Dela Cruz" → "JC". */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function Avatar({
  name,
  src,
  size = 'sm',
  className,
}: {
  name: string
  src?: string | null
  size?: AvatarSize
  className?: string
}) {
  const box = cx('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill', SIZES[size], className)
  if (src) {
    // Profile photos come from Supabase storage; a plain <img> avoids image-domain setup.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cx(box, 'object-cover')} />
  }
  return (
    <span className={cx(box, 'bg-surface-soft font-semibold text-ink-2')} aria-label={name} role="img">
      {initialsOf(name)}
    </span>
  )
}

/** Overlapping avatars for a crew; shows "+3" when there are more than `max`. */
export function AvatarStack({
  people,
  max = 4,
  size = 'sm',
  className,
}: {
  people: { name: string; src?: string | null }[]
  max?: number
  size?: AvatarSize
  className?: string
}) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  const ring = 'ring-2 ring-surface'
  let more: ReactNode = null
  if (extra > 0) {
    more = (
      <span className={cx('inline-flex items-center justify-center rounded-pill bg-action font-semibold text-on-action', SIZES[size], ring)}>
        +{extra}
      </span>
    )
  }
  return (
    <div className={cx('flex -space-x-2', className)}>
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} src={p.src} size={size} className={ring} />
      ))}
      {more}
    </div>
  )
}
