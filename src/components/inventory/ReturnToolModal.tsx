// ReturnToolModal: check a borrowed tool back in and record its condition (good, some wear, damaged, lost).
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Undo2 } from 'lucide-react'
import { returnTool } from '@/app/actions/inventory'
import { Button, Field, Input, Modal, Textarea, cx } from '@/components/ui'
import { CONDITIONS, daysOut, peso, type Borrowing, type Condition } from './types'

export function ReturnToolModal({ borrowing, onClose, onDone }: { borrowing: Borrowing | null; onClose: () => void; onDone: () => void }) {
  const [condition, setCondition] = useState<Condition>('good')
  const [notes, setNotes] = useState('')
  const [fee, setFee] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    setCondition('good')
    setNotes('')
    setFee(0)
    setError(null)
  }, [borrowing?.id])

  if (!borrowing) return null
  const needsFee = condition === 'damaged' || condition === 'lost'
  const unitCost = borrowing.tool_catalog?.unit_cost || 0

  function save() {
    if (!borrowing) return
    if (needsFee && !notes.trim()) return setError('Write what happened to the tool.')
    const finalStatus = condition === 'good' || condition === 'minor_wear' ? 'returned' : condition
    startSaving(async () => {
      const res = await returnTool(borrowing.id, finalStatus, condition, notes, needsFee ? Number(fee) || 0 : 0)
      if (res?.error) setError(res.error)
      else onDone()
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={Undo2}
      title={`Check in ${borrowing.tool_catalog?.name || 'tool'}`}
      subtitle={`${borrowing.profiles?.full_name || 'Staff'} · ${borrowing.quantity} ${borrowing.quantity === 1 ? 'unit' : 'units'} · ${daysOut(borrowing)} days out`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Check in</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <fieldset>
          <legend className="mb-1.5 text-caption font-medium text-ink-2">Condition</legend>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((c) => (
              <label
                key={c.value}
                className={cx(
                  'cursor-pointer rounded-control border p-3 transition-colors',
                  condition === c.value ? 'border-ink bg-surface-soft' : 'border-line hover:border-line-strong',
                )}
              >
                <input type="radio" name="condition" value={c.value} checked={condition === c.value} onChange={() => setCondition(c.value)} className="sr-only" />
                <span className="block text-small font-medium text-ink">{c.label}</span>
                <span className="block text-caption text-ink-3">{c.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {needsFee && (
          <Field label="Charge to the employee (₱)" htmlFor="return-fee" hint={unitCost ? `The tool costs ${peso(unitCost)} each.` : 'Leave 0 for no charge.'}>
            <Input id="return-fee" type="number" min={0} step="0.01" value={fee} onChange={(e) => setFee(Number(e.target.value))} />
          </Field>
        )}
        <Field label={needsFee ? 'What happened' : 'Notes'} htmlFor="return-notes" required={needsFee} hint={needsFee ? undefined : 'Optional'} error={error}>
          <Textarea id="return-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hose cracked at the fitting." />
        </Field>
      </div>
    </Modal>
  )
}
