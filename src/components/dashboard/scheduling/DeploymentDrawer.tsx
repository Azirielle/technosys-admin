// DeploymentDrawer: the "New out-of-town job" form — a multi-day project where the crew stays on site. Project, team, review.
'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { createDeploymentAction } from '@/app/actions/schedules'
import { Button, Drawer, Field, Input, Steps, Textarea } from '@/components/ui'
import { formatDisplayDate, formatLocalDate, type ProfileItem, type ScheduleItem } from './types'
import TeamSelectionDirectory from './TeamSelectionDirectory'

interface DeploymentDrawerProps {
  isOpen: boolean
  onClose: () => void
  profiles: ProfileItem[]
  existingSchedules?: ScheduleItem[]
  selectedDate?: Date
  onSuccess: () => void
}

const STEPS = ['Project', 'Team', 'Review']

function plusDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return formatLocalDate(x)
}

export default function DeploymentDrawer({ isOpen, onClose, profiles, existingSchedules = [], selectedDate, onSuccess }: DeploymentDrawerProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [start, setStart] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [notes, setNotes] = useState('')
  const [techIds, setTechIds] = useState<string[]>([])
  const [leadId, setLeadId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const from = selectedDate || new Date()
    setStep(1)
    setName('')
    setPlace('')
    setStart(formatLocalDate(from))
    setCheckIn(plusDays(from, 30))
    setNotes('')
    setTechIds([])
    setLeadId('')
    setError(null)
  }, [isOpen, selectedDate])

  if (!isOpen) return null

  function toggleTech(id: string) {
    setTechIds((prev) => {
      const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
      if (!next.includes(leadId)) setLeadId(next[0] ?? '')
      else if (!leadId) setLeadId(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await createDeploymentAction({ projectName: name, location: place, startDate: start, targetReviewDate: checkIn, leadTechnicianId: leadId || techIds[0], crewTechnicianIds: techIds, notes })
      if (res.error) setError(res.error)
      else {
        onSuccess()
        onClose()
      }
    } catch (err) {
      setError((err as Error).message || "Couldn't save the project.")
    } finally {
      setSaving(false)
    }
  }

  const canGoOn = step === 1 ? Boolean(name.trim() && place.trim() && start) : techIds.length > 0
  const lead = profiles.find((p) => p.id === leadId)

  return (
    <Drawer
      isOpen
      onClose={onClose}
      width="xl"
      title="New out-of-town job"
      subtitle="A project over several days where the crew stays near the site."
      footer={
        <>
          {step > 1 ? <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(step - 1)}>Back</Button> : <Button variant="ghost" onClick={onClose}>Cancel</Button>}
          {step < STEPS.length ? (
            <Button variant="primary" iconRight={ChevronRight} disabled={!canGoOn} onClick={() => setStep(step + 1)}>
              {step === 2 && techIds.length === 0 ? 'Pick at least one person' : 'Next'}
            </Button>
          ) : (
            <Button variant="primary" icon={Check} loading={saving} onClick={save}>Save project</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-section">
        <Steps steps={STEPS} current={step} onSelect={(n) => (n < step || canGoOn) && setStep(n)} />
        {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger">{error}</p>}

        {step === 1 && (
          <div className="flex flex-col gap-stack">
            <Field label="Project name" htmlFor="dep-name" required>
              <Input id="dep-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chiller installation, Batangas plant" />
            </Field>
            <Field label="Place" htmlFor="dep-place" required>
              <Input id="dep-place" icon={MapPin} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Batangas Industrial Park, Calaca" />
            </Field>
            <div className="grid grid-cols-2 gap-stack">
              <Field label="Starts" htmlFor="dep-start" required>
                <Input id="dep-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Check-in date" htmlFor="dep-check" hint="When to review progress. Not an end date.">
                <Input id="dep-check" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </Field>
            </div>
            <Field label="Notes" htmlFor="dep-notes" hint="Optional">
              <Textarea id="dep-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Crew stays at the site dormitory; the tool van goes with them." />
            </Field>
          </div>
        )}

        {step === 2 && (
          <TeamSelectionDirectory
            profiles={profiles}
            selectedTechIds={techIds}
            onToggleTech={toggleTech}
            leadTechId={leadId}
            onSelectLead={setLeadId}
            targetDate={start}
            existingSchedules={existingSchedules}
            requireLead
            hideCasualHelpers
          />
        )}

        {step === 3 && (
          <dl className="grid grid-cols-1 gap-4 rounded-control bg-surface-soft p-4 sm:grid-cols-2">
            <div><dt className="text-caption text-ink-3">Project</dt><dd className="text-small text-ink">{name}</dd></div>
            <div><dt className="text-caption text-ink-3">Place</dt><dd className="text-small text-ink">{place}</dd></div>
            <div><dt className="text-caption text-ink-3">Starts</dt><dd className="text-small text-ink">{formatDisplayDate(start)}</dd></div>
            <div><dt className="text-caption text-ink-3">Check-in</dt><dd className="text-small text-ink">{checkIn ? formatDisplayDate(checkIn) : '—'}</dd></div>
            <div><dt className="text-caption text-ink-3">Lead</dt><dd className="text-small text-ink">{lead?.full_name ?? '—'}</dd></div>
            <div><dt className="text-caption text-ink-3">Crew</dt><dd className="text-small text-ink">{techIds.length} {techIds.length === 1 ? 'person' : 'people'}</dd></div>
            {notes && <div className="sm:col-span-2"><dt className="text-caption text-ink-3">Notes</dt><dd className="text-small text-ink">{notes}</dd></div>}
          </dl>
        )}
      </div>
    </Drawer>
  )
}
