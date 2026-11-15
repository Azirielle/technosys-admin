// ShortcutHelp: the "?" window listing every keyboard shortcut for this role.
'use client'

import { Keyboard } from 'lucide-react'
import { Modal } from '@/components/ui'
import { QUICK_ACTIONS, type AdminRole } from '@/components/dashboard/quickActionList'
import { Keys } from './Keys'

const GENERAL: { keys: string[]; what: string }[] = [
  { keys: ['Ctrl', 'K'], what: 'Quick actions: find a page, an action, a person or a record' },
  { keys: ['N'], what: 'Start a new one on this page (job, tool, policy, announcement…)' },
  { keys: ['/'], what: "Jump to this page's search box" },
  { keys: ['↑', '↓'], what: 'Move between rows in a list or table' },
  { keys: ['Enter'], what: 'Open the highlighted row' },
  { keys: ['?'], what: 'Show this list' },
  { keys: ['Esc'], what: 'Close a window' },
]

function Row({ keys, what }: { keys: string[]; what: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-2">
      <span className="text-small text-ink">{what}</span>
      <Keys keys={keys} />
    </li>
  )
}

export function ShortcutHelp({ role, open, onClose }: { role: AdminRole; open: boolean; onClose: () => void }) {
  const pages = QUICK_ACTIONS[role].filter((a) => a.group === 'Go to')
  return (
    <Modal isOpen={open} onClose={onClose} icon={Keyboard} title="Keyboard shortcuts" subtitle="Work without the mouse" maxWidth="md">
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="text-caption font-medium text-ink-3">Anywhere</h3>
          <ul className="divide-y divide-line">{GENERAL.map((r) => <Row key={r.what} {...r} />)}</ul>
        </section>
        {role === 'hr' && (
          <section>
            <h3 className="text-caption font-medium text-ink-3">In a leave request</h3>
            <ul className="divide-y divide-line">
              <Row keys={['A']} what="Approve the leave" />
              <Row keys={['D']} what="Decline it (write the reason, then Ctrl Enter)" />
            </ul>
          </section>
        )}
        <section>
          <h3 className="text-caption font-medium text-ink-3">Go to a page (press G, then the letter)</h3>
          <ul className="divide-y divide-line">{pages.map((p) => <Row key={p.id} keys={p.keys ?? []} what={p.title} />)}</ul>
        </section>
      </div>
    </Modal>
  )
}
