// GiveAccessModal: the CEO lends one office role some of the other role's pages for a set time (e.g. HR covers Scheduling).
'use client'

import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import type { OverrideDuration, OverrideMetadataItem, RoleKey } from '@/lib/overrides'
import { Button, Checkbox, Field, Input, Modal, Select } from '@/components/ui'
import { DURATIONS, ROLES, expiresAtFor, pagesToLend, roleLabel } from './accessConfig'

export function GiveAccessModal({
  isOpen,
  people,
  current,
  onClose,
  onSave,
}: {
  isOpen: boolean
  people: Record<RoleKey, string>
  /** Pages each role already has through temporary access. */
  current: Record<RoleKey, string[]>
  onClose: () => void
  onSave: (role: RoleKey, modules: string[], meta: Record<string, OverrideMetadataItem>) => Promise<boolean>
}) {
  const [role, setRole] = useState<RoleKey>('hr')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [duration, setDuration] = useState<OverrideDuration>('1_day')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setPicked(new Set())
    setDuration('1_day')
    setReason('')
    setError(null)
  }, [isOpen, role])

  if (!isOpen) return null
  const pages = pagesToLend(role)

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    if (picked.size === 0) return setError('Tick at least one page.')
    setSaving(true)
    const expires_at = expiresAtFor(duration)
    const granted_at = new Date().toISOString()
    const meta: Record<string, OverrideMetadataItem> = {}
    for (const id of picked) meta[id] = { duration, expires_at, granted_at, granted_by_name: reason.trim() || 'Covering for the other department' }
    const ok = await onSave(role, [...new Set([...(current[role] ?? []), ...picked])], meta)
    setSaving(false)
    if (!ok) setError("Couldn't save. Try again.")
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={KeyRound}
      title="Give temporary access"
      subtitle="Let HR or Service Dept use the other department's pages, for example while someone is on leave."
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Give access</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="Who gets access" htmlFor="access-role">
          <Select
            id="access-role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleKey)}
            options={ROLES.map((r) => ({ value: r.value, label: `${people[r.value]} (${r.label})` }))}
          />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-caption font-medium text-ink-2">Pages to open for them</legend>
          {pages.map((p) => {
            const already = current[role]?.includes(p.id)
            return (
              <Checkbox
                key={p.id}
                checked={picked.has(p.id)}
                onChange={() => toggle(p.id)}
                label={p.name}
                hint={already ? 'Already open; this resets the end date' : `Normally ${roleLabel(p.owner)} only`}
              />
            )
          })}
        </fieldset>
        <Field label="For how long" htmlFor="access-duration">
          <Select id="access-duration" value={duration} onChange={(e) => setDuration(e.target.value as OverrideDuration)} options={DURATIONS} />
        </Field>
        <Field label="Reason" htmlFor="access-reason" hint="Optional. Shown in the list of who has access." error={error}>
          <Input id="access-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Aileen is on leave until Friday" />
        </Field>
      </div>
    </Modal>
  )
}
