// ReturnToolModal: check a borrowed tool back in and record its condition (good, some wear, damaged, lost).
// No charge to the employee: pay amounts are out of scope, so damaged / lost only need what happened.
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Undo2 } from 'lucide-react'
import { returnTool } from '@/app/actions/inventory'
import { Button, Field, Modal, Textarea, cx } from '@/components/ui'
import { CONDITIONS, daysOut, type Borrowing, type Condition } from './types'

export function ReturnToolModal({ borrowing, onClose, onDone }: { borrowing: Borrowing | null; onClose: () => void; onDone: () => void }) {
  const [condition, setCondition] = useState<Condition>('good')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    setCondition('good')
    setNotes('')
    setError(null)
  }, [borrowing?.id])

  if (!borrowing) return null
  const needsNote = condition === 'damaged' || condition === 'lost'

  function save() {
    if (!borrowing) return
    if (needsNote && !notes.trim()) return setError('Write what happened to the tool.')
    const finalStatus = condition === 'good' || condition === 'minor_wear' ? 'returned' : condition
    startSaving(async () => {
      const res = await returnTool(borrowing.id, finalStatus, condition, notes)
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

        <Field label={needsNote ? 'What happened' : 'Notes'} htmlFor="return-notes" required={needsNote} hint={needsNote ? undefined : 'Optional'} error={error}>
          <Textarea id="return-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hose cracked at the fitting." />
        </Field>
      </div>
    </Modal>
  )
}
