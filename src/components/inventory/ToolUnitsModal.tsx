// ToolUnitsModal: every physical tool of one kind with its own ID (e.g. TC-DEW-0003): where it is now, who has it,
// and for one checked in damaged: "Back in service" (it can still be used) or "Write off" (C19).
'use client'

import { useState } from 'react'
import { Tags } from 'lucide-react'
import { decideUnit } from '@/app/actions/toolUnits'
import { Badge, Button, Modal, useToast, type Tone } from '@/components/ui'
import type { Borrowing, Tool, ToolUnit } from './types'

const STATUS: Record<ToolUnit['status'], { label: string; tone: Tone }> = {
  available: { label: 'In the warehouse', tone: 'success' },
  lent: { label: 'Lent', tone: 'info' },
  needs_check: { label: 'Needs checking', tone: 'warning' },
  lost: { label: 'Lost', tone: 'danger' },
  retired: { label: 'Written off', tone: 'neutral' },
}

export function ToolUnitsModal({ tool, units, borrowings, onClose, onChanged }: {
  tool: Tool | null
  units: ToolUnit[]
  borrowings: Borrowing[]
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  if (!tool) return null
  const holder = (unitId: string) => borrowings.find((b) => b.unit_id === unitId && b.status === 'checked_out')?.profiles?.full_name

  async function decide(u: ToolUnit, backInService: boolean) {
    setBusy(u.id)
    const res = await decideUnit(u.id, backInService)
    setBusy(null)
    if (res.error) return toast.error(res.error)
    toast.success(backInService ? `${u.tag} is back in the warehouse` : `${u.tag} is written off`)
    onChanged()
  }

  return (
    <Modal isOpen onClose={onClose} icon={Tags} title={tool.name} subtitle="Each tool has its own ID. Lend picks the IDs you hand over." maxWidth="md"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <ul className="flex flex-col divide-y divide-line">
        {units.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
            <span className="w-28 font-mono text-small">{u.tag}</span>
            <Badge tone={STATUS[u.status].tone} dot>{STATUS[u.status].label}</Badge>
            {u.status === 'lent' && <span className="text-small text-ink-2">{holder(u.id) ?? ''}</span>}
            {u.status === 'needs_check' && (
              <span className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" loading={busy === u.id} onClick={() => decide(u, false)}>Write off</Button>
                <Button size="sm" loading={busy === u.id} onClick={() => decide(u, true)}>Back in service</Button>
              </span>
            )}
          </li>
        ))}
        {!units.length && <li className="py-2 text-small text-ink-3">No IDs yet.</li>}
      </ul>
    </Modal>
  )
}
