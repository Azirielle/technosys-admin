// useShortcuts: keyboard shortcuts for experienced admins, anywhere in the admin.
//   G then a letter → go to a page (G L = Leave requests …)   N → start a new one on this page
//   /  → jump to this page's search box                       ?  → show every shortcut
//   ↑ ↓ → move between rows you can open; Enter opens the row
// They are ignored while you type in a box or while a window (modal, drawer, Quick actions) is open.
'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { goToShortcuts, type AdminRole } from '@/components/dashboard/quickActionList'
import { runPageCommand } from './pageCommands'

const SEQUENCE_MS = 1200

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

function windowIsOpen() {
  return document.querySelector('[role="dialog"]') !== null
}

/** The page's main search box: the first visible input whose label or placeholder says "search". */
function focusPageSearch() {
  const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('main input, input'))
  const box = boxes.find((i) => {
    const words = `${i.getAttribute('aria-label') ?? ''} ${i.placeholder ?? ''}`.toLowerCase()
    return words.includes('search') && i.offsetParent !== null
  })
  if (!box) return false
  box.focus()
  box.select()
  return true
}

/** ↑/↓: move between the rows you can open on this page (table rows, the ticket list). Enter opens one. */
function moveRow(step: 1 | -1) {
  const rows = Array.from(document.querySelectorAll<HTMLElement>('main [data-nav-row]')).filter((r) => r.offsetParent !== null)
  if (rows.length === 0) return false
  const at = rows.indexOf(document.activeElement as HTMLElement)
  const next = at === -1 ? (step === 1 ? 0 : rows.length - 1) : Math.min(Math.max(at + step, 0), rows.length - 1)
  rows[next].focus()
  rows[next].scrollIntoView({ block: 'nearest' })
  return true
}

export function useShortcuts(role: AdminRole, onHelp: () => void) {
  const router = useRouter()
  const pathname = usePathname()
  const waitingForG = useRef<number | null>(null)

  useEffect(() => {
    const pages = goToShortcuts(role)

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || windowIsOpen()) return
      const key = e.key.toLowerCase()

      // Second key of "G then a letter".
      if (waitingForG.current !== null) {
        window.clearTimeout(waitingForG.current)
        waitingForG.current = null
        const path = pages[key]
        if (path) {
          e.preventDefault()
          router.push(path)
        }
        return
      }

      if (key === 'g') {
        waitingForG.current = window.setTimeout(() => (waitingForG.current = null), SEQUENCE_MS)
      } else if (key === 'n') {
        e.preventDefault()
        runPageCommand(router, pathname, { path: pathname, command: 'new' })
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (moveRow(e.key === 'ArrowDown' ? 1 : -1)) e.preventDefault()
      } else if (e.key === '/') {
        if (focusPageSearch()) e.preventDefault()
      } else if (e.key === '?') {
        e.preventDefault()
        onHelp()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (waitingForG.current !== null) window.clearTimeout(waitingForG.current)
    }
  }, [role, router, pathname, onHelp])
}
