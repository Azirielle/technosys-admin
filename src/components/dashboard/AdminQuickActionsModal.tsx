// AdminQuickActionsModal: the Ctrl K palette. Type to find a page or action; arrows to move, Enter to open, Esc to close.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CornerDownLeft, Moon, Search, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cx } from '@/components/ui'
import { QUICK_ACTIONS, type AdminRole, type QuickAction } from './quickActionList'

type Item = Pick<QuickAction, 'id' | 'title' | 'hint' | 'icon' | 'keywords'> & { run: () => void }

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-chip bg-surface-soft px-1.5 py-0.5 font-mono text-micro text-ink-2">{children}</kbd>
}

export function AdminQuickActionsModal({ role }: { role: AdminRole }) {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)

  const items = useMemo<Item[]>(() => {
    const go = (a: QuickAction) => () => {
      setOpen(false)
      const path = a.href.split('?')[0]
      if (a.event && pathname === path) window.dispatchEvent(new CustomEvent(a.event))
      else router.push(a.href)
    }
    const dark = resolvedTheme === 'dark'
    return [
      ...QUICK_ACTIONS[role].map((a) => ({ ...a, run: go(a) })),
      {
        id: 'theme',
        title: dark ? 'Light mode' : 'Dark mode',
        hint: 'Change how the admin looks',
        icon: dark ? Sun : Moon,
        keywords: ['theme', 'dark', 'light', 'mode'],
        run: () => {
          toggleTheme()
          setOpen(false)
        },
      },
    ]
  }, [role, pathname, router, resolvedTheme, toggleTheme])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.title.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q)))
  }, [items, query])

  // Opened by Ctrl K / Cmd K anywhere, or by the "Quick actions" button in the menu.
  useEffect(() => {
    const show = () => {
      setOpen(true)
      setQuery('')
      setIndex(0)
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setIndex(0)
      }
    }
    window.addEventListener('open-quick-actions', show)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('open-quick-actions', show)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!open) return null

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') setIndex((i) => (i + 1) % Math.max(shown.length, 1))
    else if (e.key === 'ArrowUp') setIndex((i) => (i - 1 + shown.length) % Math.max(shown.length, 1))
    else if (e.key === 'Enter') shown[index]?.run()
    else return
    e.preventDefault()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-scrim p-4 pt-[12vh] animate-in fade-in duration-150" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Quick actions" className="w-full max-w-xl overflow-hidden rounded-modal bg-surface shadow-overlay" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className="size-4 shrink-0 text-ink-3" aria-hidden />
          {/* autoFocus: focused the moment it appears, so typing right after Ctrl K is never lost. */}
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            placeholder="Search pages and actions"
            aria-label="Search pages and actions"
            className="h-14 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
          />
          <Key>Esc</Key>
        </div>

        <ul role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
          {shown.length === 0 && <li className="px-3 py-8 text-center text-small text-ink-3">Nothing matches “{query}”.</li>}
          {shown.map((item, i) => {
            const Icon = item.icon
            const active = i === index
            return (
              <li key={item.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={item.run}
                  className={cx('flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-left', active && 'bg-surface-soft')}
                >
                  <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-pill', active ? 'bg-action text-on-action' : 'bg-surface-soft text-ink-2')}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-medium text-ink">{item.title}</span>
                    <span className="block truncate text-caption text-ink-3">{item.hint}</span>
                  </span>
                  {active && <CornerDownLeft className="size-4 text-ink-3" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-4 border-t border-line px-5 py-3 text-caption text-ink-3">
          <span className="flex items-center gap-1.5"><Key>↑</Key><Key>↓</Key> move</span>
          <span className="flex items-center gap-1.5"><Key>Enter</Key> open</span>
          <span className="ml-auto flex items-center gap-1.5"><Key>Ctrl</Key><Key>K</Key> open or close</span>
        </div>
      </div>
    </div>
  )
}
