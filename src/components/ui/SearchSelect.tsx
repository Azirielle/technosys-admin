// SearchSelect: pick one item from a long list by typing part of its name (people, tools…).
// ↑/↓ move, Enter picks, Esc closes the list. Use Select instead for short fixed lists.
'use client'

import { useId, useMemo, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cx } from './cx'
import { FIELD_CLASSES } from './Field'

export interface SearchSelectOption {
  value: string
  label: string
  /** Smaller text beside the label, e.g. "Technician". Also searched. */
  hint?: string
}

export function SearchSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Type to search',
  emptyText = 'No match. Try another name.',
  invalid,
  autoFocus,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SearchSelectOption[]
  placeholder?: string
  emptyText?: string
  invalid?: boolean
  autoFocus?: boolean
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const selected = options.find((o) => o.value === value)

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return options
    return options.filter((o) => {
      const text = `${o.label} ${o.hint ?? ''}`.toLowerCase()
      return words.every((w) => text.includes(w))
    })
  }, [options, query])

  function pick(option: SearchSelectOption) {
    onChange(option.value)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + shown.length) % Math.max(shown.length, 1))
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      if (shown[active]) pick(shown[active])
    } else if (e.key === 'Escape' && open) {
      // Close only the list, not the window it sits in.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          // Shows the chosen name until you start typing a new search.
          value={open ? query : selected?.label ?? ''}
          placeholder={selected && open ? selected.label : placeholder}
          onChange={(e) => {
            // Typing over a chosen name starts a new search, not "<name><letters>"
            const v = e.target.value
            setQuery(!open && selected && v.startsWith(selected.label) ? v.slice(selected.label.length) : v)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setActive(Math.max(0, shown.findIndex((o) => o.value === value)))
          }}
          onBlur={() => {
            setOpen(false)
            setQuery('')
          }}
          onKeyDown={onKeyDown}
          className={cx(FIELD_CLASSES, 'h-control pl-10 pr-9')}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      </div>

      {open && (
        <ul id={listId} role="listbox" className="max-h-52 overflow-y-auto rounded-control border border-line bg-surface p-1 shadow-raised">
          {shown.length === 0 && <li className="px-3 py-3 text-small text-ink-3">{emptyText}</li>}
          {shown.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              // mousedown, not click: picks before the box loses focus and closes the list.
              onMouseDown={(e) => {
                e.preventDefault()
                pick(o)
              }}
              onMouseEnter={() => setActive(i)}
              className={cx(
                'flex cursor-pointer items-center gap-2 rounded-chip px-3 py-2 text-small',
                i === active ? 'bg-surface-soft' : '',
              )}
            >
              <span className="min-w-0 flex-1 truncate text-ink">{o.label}</span>
              {o.hint && <span className="shrink-0 text-caption text-ink-3">{o.hint}</span>}
              {o.value === value && <Check className="size-4 shrink-0 text-ink-2" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
