// LendToolModal: hand a tool to a technician or helper (who, how many, notes).
'use client'

import { useEffect, useState, useTransition } from 'react'
import { HandHelping } from 'lucide-react'
import { assignTool } from '@/app/actions/inventory'
import { Button, Field, Input, Modal, Select } from '@/components/ui'
import type { Person, Tool } from './types'

export function LendToolModal({
  tool,
  people,
  onClose,
  onDone,
}: {
  tool: Tool | null
  people: Person[]
  onClose: () => void
  onDone: () => void
}) {
  const [personId, setPersonId] = useState('')
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    setPersonId('')
    setQty(1)
    setNotes('')
    setError(null)
  }, [tool?.id])

  if (!tool) return null

  function save() {
    if (!tool) return
    if (!personId) return setError('Choose who is borrowing it.')
    if (qty < 1 || qty > tool.available_stock) return setError(`Choose 1 to ${tool.available_stock}.`)
    startSaving(async () => {
      const res = await assignTool(personId, tool.id, qty, notes)
      if (res?.error) setError(res.error)
      else onDone()
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={HandHelping}
      title={`Lend ${tool.name}`}
      subtitle={`${tool.available_stock} in the warehouse`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Lend tool</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="Borrowed by" htmlFor="lend-person" required>
          <Select
            id="lend-person"
            placeholder="Choose a technician or helper"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            options={people.map((p) => ({ value: p.id, label: `${p.full_name} (${p.role})` }))}
          />
        </Field>
        <Field label="How many" htmlFor="lend-qty" required>
          <Input id="lend-qty" type="number" min={1} max={tool.available_stock} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </Field>
        <Field label="Notes" htmlFor="lend-notes" hint="Optional, e.g. the job or site" error={error}>
          <Input id="lend-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For the SM Southmall job" />
        </Field>
      </div>
    </Modal>
  )
}
