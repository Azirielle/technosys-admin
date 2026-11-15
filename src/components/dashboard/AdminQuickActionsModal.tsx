// AdminQuickActionsModal: Quick actions (Ctrl K). Type to find an action, a page, a person or a record, then Enter.
// Also turns on the keyboard shortcuts (G + letter, N, /, ?) and the "?" shortcut list.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Keyboard, Moon, Search, Sun } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Keys } from '@/components/commands/Keys'
import { PaletteList, type PaletteItem } from '@/components/commands/PaletteList'
import { runPageCommand } from '@/components/commands/pageCommands'
import { searchRecords, type RecordResult } from '@/components/commands/searchRecords'
import { ShortcutHelp } from '@/components/commands/ShortcutHelp'
import { useShortcuts } from '@/components/commands/useShortcuts'
import { QUICK_ACTIONS, type AdminRole } from './quickActionList'

const SEARCH_DELAY_MS = 200

function matches(item: { title: string; hint: string; keywords?: string[] }, q: string) {
  return item.title.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q) || (item.keywords ?? []).some((k) => k.includes(q))
}

export function AdminQuickActionsModal({ role }: { role: AdminRole }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const { resolvedTheme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [records, setRecords] = useState<RecordResult[]>([])
  const [searching, setSearching] = useState(false)

  const showHelp = useCallback(() => setHelpOpen(true), [])
  useShortcuts(role, showHelp)

  /** Typing: show the "looking up" rows at once (2+ letters), or clear old results. */
  function changeQuery(text: string) {
    setQuery(text)
    setIndex(0)
    const long = text.trim().length >= 2
    setSearching(long)
    if (!long) setRecords([])
  }

  // Look up people and records a moment after typing stops.
  useEffect(() => {
    if (!open || query.trim().length < 2) return
    let current = true
    const timer = window.setTimeout(() => {
      searchRecords(supabase, role, query)
        .then((r) => current && setRecords(r))
        .catch(() => current && setRecords([]))
        .finally(() => current && setSearching(false))
    }, SEARCH_DELAY_MS)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [open, query, role, supabase])

  const items = useMemo<PaletteItem[]>(() => {
    const close = (fn: () => void) => () => {
      setOpen(false)
      fn()
    }
    const q = query.trim().toLowerCase()
    const actions = QUICK_ACTIONS[role]
      .filter((a) => !q || matches(a, q))
      .map((a) => ({
        ...a,
        run: close(() => (a.command ? runPageCommand(router, pathname, { path: a.path, command: a.command }) : router.push(a.path))),
      }))
      // Actions first, then pages.
      .sort((a, b) => (a.group === b.group ? 0 : a.group === 'Do' ? -1 : 1))
    const found = records.map((r) => ({ ...r, group: 'People and records', run: close(() => runPageCommand(router, pathname, r.target)) }))
    const dark = resolvedTheme === 'dark'
    const settings: PaletteItem[] = [
      { id: 'shortcuts', group: 'Settings', title: 'Keyboard shortcuts', hint: 'Every shortcut, to work without the mouse', icon: Keyboard, keys: ['?'], run: close(showHelp) },
      { id: 'theme', group: 'Settings', title: dark ? 'Light mode' : 'Dark mode', hint: 'Change how the admin looks', icon: dark ? Sun : Moon, run: close(toggleTheme) },
    ].filter((s) => !q || matches({ ...s, keywords: ['theme', 'dark', 'light', 'keyboard', 'shortcut', 'keys'] }, q))
    return [...actions, ...found, ...settings]
  }, [role, query, records, router, pathname, resolvedTheme, toggleTheme, showHelp])

  // Opened by Ctrl K / Cmd K anywhere, or by the "Quick actions" button in the menu.
  useEffect(() => {
    const reset = () => {
      setQuery('')
      setIndex(0)
      setRecords([])
      setSearching(false)
    }
    const show = () => {
      setOpen(true)
      reset()
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        reset()
      }
    }
    window.addEventListener('open-quick-actions', show)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('open-quick-actions', show)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') setIndex((i) => (i + 1) % Math.max(items.length, 1))
    else if (e.key === 'ArrowUp') setIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1))
    else if (e.key === 'Enter') items[Math.min(index, items.length - 1)]?.run()
    else return
    e.preventDefault()
  }

  return (
    <>
      <ShortcutHelp role={role} open={helpOpen} onClose={() => setHelpOpen(false)} />
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-scrim p-4 pt-[12vh] animate-in fade-in duration-150" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Quick actions" className="w-full max-w-xl overflow-hidden rounded-modal bg-surface shadow-overlay" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="size-4 shrink-0 text-ink-3" aria-hidden />
              {/* autoFocus: focused the moment it appears, so typing right after Ctrl K is never lost. */}
              <input
                autoFocus
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                placeholder="Find an action, page, person or record"
                aria-label="Find an action, page, person or record"
                className="h-14 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
              />
              <Keys keys={['Esc']} />
            </div>

            <PaletteList items={items} index={index} searching={searching} query={query} onHover={setIndex} />

            <div className="flex items-center gap-4 border-t border-line px-5 py-3 text-caption text-ink-3">
              <span className="flex items-center gap-1.5"><Keys keys={['↑', '↓']} /> move</span>
              <span className="flex items-center gap-1.5"><Keys keys={['Enter']} /> open</span>
              <span className="ml-auto flex items-center gap-1.5"><Keys keys={['?']} /> all shortcuts</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
