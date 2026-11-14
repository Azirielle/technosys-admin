// PublishPolicyModal, RequestChangesModal and ArchivePolicyModal: the three decisions on a policy.
'use client'

import { useEffect, useState } from 'react'
import { Archive, CheckCircle2, MessageSquareWarning } from 'lucide-react'
import { archivePolicy, publishPolicy, requestPolicyChanges, type CompanyPolicy } from '@/app/actions/policies'
import { Button, Checkbox, Field, Input, Modal, Textarea } from '@/components/ui'
import { daysFromToday } from './policyLabels'

type Done = (p: CompanyPolicy) => void

export function PublishPolicyModal({ policy, onClose, onDone }: { policy: CompanyPolicy | null; onClose: () => void; onDone: Done }) {
  const [date, setDate] = useState(daysFromToday(3))
  const [bigChange, setBigChange] = useState(false)
  const [now, setNow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDate(daysFromToday(3))
    setBigChange(false)
    setNow(false)
    setError(null)
  }, [policy?.id])

  if (!policy) return null

  async function publish() {
    if (!policy) return
    setSaving(true)
    const res = await publishPolicy(policy.id, { effectiveDate: date, isMaterialChange: bigChange, emergencyImmediate: now })
    setSaving(false)
    if (res.success && res.policy) onDone(res.policy)
    else setError(res.error || "Couldn't publish.")
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={CheckCircle2}
      iconTone="success"
      title="Publish this policy?"
      subtitle={`${policy.title} · ${policy.version}`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={publish}>Publish</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <p className="text-small text-ink-2">It replaces any earlier version. If it must be signed, staff are asked to sign it in the app.</p>
        <Field label="Takes effect" htmlFor="pub-date" hint="Giving staff about 3 days to read it is usual." error={error}>
          <Input id="pub-date" type="date" value={date} disabled={now} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Checkbox checked={bigChange} onChange={(e) => setBigChange(e.target.checked)} label="Big change" hint="Everyone has to sign again, even if they signed an earlier version." />
        <Checkbox checked={now} onChange={(e) => setNow(e.target.checked)} label="Takes effect today" hint="Only for urgent safety or legal changes." />
      </div>
    </Modal>
  )
}

export function RequestChangesModal({ policy, onClose, onDone }: { policy: CompanyPolicy | null; onClose: () => void; onDone: Done }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setNotes('')
    setError(null)
  }, [policy?.id])

  if (!policy) return null

  async function send() {
    if (!policy) return
    if (!notes.trim()) return setError('Write what needs to change.')
    setSaving(true)
    const res = await requestPolicyChanges(policy.id, notes.trim())
    setSaving(false)
    if (res.success && res.policy) onDone(res.policy)
    else setError(res.error || "Couldn't send it back.")
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={MessageSquareWarning}
      iconTone="warning"
      title="Ask for changes"
      subtitle={`${policy.title} goes back to draft with your notes.`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={send}>Send back to draft</Button>
        </>
      }
    >
      <Field label="What needs to change" htmlFor="changes-notes" required error={error}>
        <Textarea id="changes-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Section 3 should say who to call when the site is closed." />
      </Field>
    </Modal>
  )
}

export function ArchivePolicyModal({ policy, onClose, onDone }: { policy: CompanyPolicy | null; onClose: () => void; onDone: Done }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!policy) return null

  async function archive() {
    if (!policy) return
    setSaving(true)
    const res = await archivePolicy(policy.id)
    setSaving(false)
    if (res.success && res.policy) onDone(res.policy)
    else setError(res.error || "Couldn't archive.")
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={Archive}
      title="Archive this policy?"
      subtitle={policy.title}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Keep it</Button>
          <Button variant="danger" loading={saving} onClick={archive}>Archive</Button>
        </>
      }
    >
      <p className="text-small text-ink-2">Staff stop seeing it in the app. It stays here, with its signatures, for records.</p>
      {error && <p role="alert" className="mt-3 text-small text-danger">{error}</p>}
    </Modal>
  )
}
