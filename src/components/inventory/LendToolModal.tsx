// LendToolModal: hand tools to a technician or helper: who, WHICH ones (each tool has its own ID, e.g. TC-DEW-0003),
// how it gets there (picks up at the office / driver delivers) and notes. From a tool request the borrower is the
// person who asked (locked) and the number they asked for is ticked first.
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { HandHelping } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { lendUnits } from '@/app/actions/toolUnits'
import { Button, Field, Input, Modal, SearchSelect, Tabs, cx } from '@/components/ui'
import type { Person, Tool } from './types'

const ROLE: Record<string, string> = { technician: 'Technician', helper: 'Helper' }
type Unit = { id: string; tag: string }

export function LendToolModal({
  tool,
  people,
  onClose,
  onDone,
  start,
}: {
  tool: Tool | null
  people: Person[]
  /** From a tool request: who asked (locked) and how many they asked for */
  start?: { personId: string; qty: number; delivery?: 'pickup' | 'driver' }
  onClose: () => void
  /** `tags`: the IDs that were lent */
  onDone: (tags: string[]) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [personId, setPersonId] = useState(start?.personId ?? '')
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [delivery, setDelivery] = useState<'pickup' | 'driver'>('pickup')
  const [notes, setNotes] = useState('')
  const [tried, setTried] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  // Start fresh for every tool: the units in the warehouse, the first ones ticked
  useEffect(() => {
    if (!tool) return
    setPersonId(start?.personId ?? '')
    setUnits(null)
    setDelivery(start?.delivery ?? 'pickup')
    setNotes('')
    setTried(false)
    setServerError(null)
    supabase.from('tool_units').select('id, tag').eq('tool_id', tool.id).eq('status', 'available').order('tag')
      .then(({ data }) => {
        const list = (data ?? []) as Unit[]
        setUnits(list)
        setPicked(list.slice(0, Math.max(1, start?.qty ?? 1)).map((u) => u.id))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool?.id])

  if (!tool) return null
  const requester = start ? people.find((p) => p.id === start.personId) : null
  const personError = tried && !personId ? 'Choose who is borrowing it.' : null
  const pickError = tried && !picked.length ? 'Tick at least one tool ID.' : null
  const toggle = (id: string) => { setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); setServerError(null) }

  function save() {
    setTried(true)
    setServerError(null)
    if (!personId || !picked.length) return
    startSaving(async () => {
      const res = await lendUnits(personId, picked, notes, delivery)
      if (res.error) setServerError(res.error)
      else onDone(res.tags ?? [])
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={HandHelping}
      title={`Lend ${tool.name}`}
      subtitle={units === null ? 'Loading…' : units.length ? `${units.length} in the warehouse` : 'None left in the warehouse'}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} disabled={!units?.length} onClick={save}>
            {picked.length > 1 ? `Lend ${picked.length} tools` : 'Lend tool'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="Borrowed by" htmlFor="lend-person" required error={personError}
          hint={requester ? 'The person who asked for it in a tool request.' : undefined}>
          {requester ? (
            <p id="lend-person" className="rounded-control bg-surface-soft px-3 py-2 text-small text-ink">{requester.full_name} · {ROLE[requester.role] ?? requester.role}</p>
          ) : (
            <SearchSelect
              id="lend-person"
              value={personId}
              onChange={(id) => { setPersonId(id); setServerError(null) }}
              options={people.map((p) => ({ value: p.id, label: p.full_name, hint: ROLE[p.role] ?? p.role }))}
              placeholder="Type a name"
              emptyText="No technician or helper with that name."
              invalid={!!personError}
              autoFocus
            />
          )}
        </Field>
        <Field label={`Which ones (${picked.length} picked)`} htmlFor="lend-units" required error={pickError}
          hint={start && start.qty > 1 ? `They asked for ${start.qty}.` : 'Tick the tool IDs you hand over.'}>
          <div id="lend-units" role="group" className="flex flex-wrap gap-2">
            {(units ?? []).map((u) => {
              const on = picked.includes(u.id)
              return (
                <button key={u.id} type="button" aria-pressed={on} onClick={() => toggle(u.id)}
                  className={cx('rounded-control border px-2.5 py-1 font-mono text-small transition-colors',
                    on ? 'border-action bg-action text-on-action' : 'border-line bg-surface text-ink hover:bg-surface-soft')}>
                  {u.tag}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="How it gets there" htmlFor="lend-delivery">
          <Tabs label="How it gets there" value={delivery} onChange={setDelivery}
            items={[{ value: 'pickup', label: 'Picks up at the office' }, { value: 'driver', label: 'Driver delivers' }]} />
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
