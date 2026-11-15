// LendToolModal: hand a tool to a technician or helper (who, how many, notes).
// The person is found by typing part of the name; "How many" is checked against the stock as you type.
'use client'

import { useState, useTransition } from 'react'
import { HandHelping } from 'lucide-react'
import { assignTool } from '@/app/actions/inventory'
import { Button, Field, Input, Modal, SearchSelect } from '@/components/ui'
import type { Person, Tool } from './types'

const ROLE: Record<string, string> = { technician: 'Technician', helper: 'Helper' }

/** What's wrong with the amount typed, or null when it can be lent. */
function quantityProblem(text: string, inStock: number): string | null {
  if (text.trim() === '') return 'Enter how many.'
  const n = Number(text)
  if (!Number.isInteger(n)) return 'Use a whole number.'
  if (n < 1) return 'Lend at least 1.'
  if (n > inStock) return inStock === 0 ? 'None left in the warehouse.' : `Only ${inStock} in the warehouse.`
  return null
}

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
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [tried, setTried] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  // Start fresh for every tool (reset while rendering when a different tool opens).
  const [shownId, setShownId] = useState(tool?.id)
  if (shownId !== tool?.id) {
    setShownId(tool?.id)
    setPersonId('')
    setQty('1')
    setNotes('')
    setTried(false)
    setServerError(null)
  }

  if (!tool) return null
  const inStock = tool.available_stock
  const qtyError = quantityProblem(qty, inStock)
  const personError = tried && !personId ? 'Choose who is borrowing it.' : null

  function save() {
    if (!tool) return
    setTried(true)
    setServerError(null)
    if (!personId || qtyError) return
    startSaving(async () => {
      const res = await assignTool(personId, tool.id, Number(qty), notes)
      if (res?.error) setServerError(res.error)
      else onDone()
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={HandHelping}
      title={`Lend ${tool.name}`}
      subtitle={inStock === 0 ? 'None left in the warehouse' : `${inStock} in the warehouse`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} disabled={!!qtyError} onClick={save}>Lend tool</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="Borrowed by" htmlFor="lend-person" required error={personError}>
          <SearchSelect
            id="lend-person"
            value={personId}
            onChange={(id) => {
              setPersonId(id)
              setServerError(null)
            }}
            options={people.map((p) => ({ value: p.id, label: p.full_name, hint: ROLE[p.role] ?? p.role }))}
            placeholder="Type a name"
            emptyText="No technician or helper with that name."
            invalid={!!personError}
            autoFocus
          />
        </Field>
        <Field label="How many" htmlFor="lend-qty" required error={qtyError} hint={`Up to ${inStock}`}>
          <Input
            id="lend-qty"
            type="number"
            inputMode="numeric"
            min={1}
            max={inStock}
            step={1}
            value={qty}
            invalid={!!qtyError}
            onChange={(e) => {
              setQty(e.target.value)
              setServerError(null)
            }}
          />
        </Field>
        <Field label="Notes" htmlFor="lend-notes" hint="Optional, e.g. the job or site">
          <Input id="lend-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For the SM Southmall job" />
        </Field>
        {serverError && (
          <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger">{serverError}</p>
        )}
      </div>
    </Modal>
  )
}
