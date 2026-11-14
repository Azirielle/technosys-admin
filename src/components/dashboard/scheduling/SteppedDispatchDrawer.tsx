// SteppedDispatchDrawer: the "New on-site job" form in four steps — job, time, team, review — then saves it.
'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { createOnSiteServiceAction } from '@/app/actions/schedules'
import { Button, Drawer, Steps } from '@/components/ui'
import { formatLocalDate, type CasualHelperItem, type ProfileItem, type ScheduleItem } from './types'
import TeamSelectionDirectory from './TeamSelectionDirectory'
import { OnSiteJobStep, type JobPlace } from './OnSiteJobStep'
import { OnSiteTimeStep, type JobTime } from './OnSiteTimeStep'
import { OnSiteReviewStep } from './OnSiteReviewStep'
import { TemporaryWorkerPicker } from './TemporaryWorkerPicker'

/** Pacita HQ, the default check-in point when no address is picked. */
const HQ = { lat: 14.3439, lon: 121.0617 }
const STEPS = ['Job', 'Time', 'Team', 'Review']

interface SteppedDispatchDrawerProps {
  isOpen: boolean
  onClose: () => void
  profiles: ProfileItem[]
  casualHelpers: CasualHelperItem[]
  existingSchedules?: ScheduleItem[]
  onOpenCasualRegisterModal: () => void
  preselectedTechId?: string
  initialSchedule?: ScheduleItem | null
  selectedDate?: Date
  onSuccess: (targetDate?: string) => void
}

function hhmm(iso: string) {
  return new Date(iso).toTimeString().slice(0, 5)
}

export default function SteppedDispatchDrawer({
  isOpen,
  onClose,
  profiles,
  casualHelpers,
  existingSchedules = [],
  onOpenCasualRegisterModal,
  preselectedTechId,
  initialSchedule,
  selectedDate,
  onSuccess,
}: SteppedDispatchDrawerProps) {
  const [step, setStep] = useState(1)
  const [place, setPlace] = useState<JobPlace>({ clientName: '', location: '', ...HQ, radius: 500 })
  const [time, setTime] = useState<JobTime>({ date: formatLocalDate(selectedDate || new Date()), startTime: '09:00', endTime: '17:00', report: 'direct_dispatch' })
  const [techIds, setTechIds] = useState<string[]>([])
  const [leadId, setLeadId] = useState('')
  const [helperIds, setHelperIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start fresh each time it opens, filled from the chosen technician, day or job.
  useEffect(() => {
    if (!isOpen) return
    setStep(1)
    setError(null)
    setHelperIds([])
    setPlace({ clientName: initialSchedule?.client_name ?? '', location: initialSchedule?.location ?? '', ...HQ, radius: 500 })
    setTime({
      date: formatLocalDate(initialSchedule?.start_time ? new Date(initialSchedule.start_time) : selectedDate || new Date()),
      startTime: initialSchedule?.start_time ? hhmm(initialSchedule.start_time) : '09:00',
      endTime: initialSchedule?.end_time ? hhmm(initialSchedule.end_time) : '17:00',
      report: 'direct_dispatch',
    })
    setTechIds(preselectedTechId ? [preselectedTechId] : [])
    setLeadId(preselectedTechId ?? '')
  }, [isOpen, preselectedTechId, initialSchedule, selectedDate])

  function toggleTech(id: string) {
    setTechIds((prev) => {
      const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
      if (!next.includes(leadId)) setLeadId(next[0] ?? '')
      else if (!leadId) setLeadId(id)
      return next
    })
  }

  async function save() {
    if (!place.clientName.trim()) {
      setStep(1)
      return setError('Enter the job or customer name.')
    }
    if (!leadId) {
      setStep(3)
      return setError('Choose who leads this job.')
    }
    setSaving(true)
    setError(null)
    try {
      const res = await createOnSiteServiceAction({
        clientName: place.clientName.trim(),
        location: place.location.trim() || 'Pacita HQ',
        date: time.date,
        startTime: time.startTime,
        endTime: time.endTime,
        reportingInstruction: time.report === 'hq' ? 'via_pacita_hq' : 'direct_to_site',
        geofenceLat: place.lat,
        geofenceLon: place.lon,
        geofenceRadius: place.radius,
        leadTechnicianId: leadId,
        crewTechnicianIds: techIds.filter((id) => id !== leadId),
        casualHelperIds: helperIds,
      })
      if (res?.error) setError(res.error)
      else {
        onSuccess(time.date)
        onClose()
      }
    } catch (err) {
      setError((err as Error).message || "Couldn't save the job.")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null
  const canGoOn = !(step === 1 && !place.clientName.trim()) && !(step === 3 && techIds.length === 0)

  return (
    <Drawer
      isOpen
      onClose={onClose}
      width="xl"
      title="New on-site job"
      subtitle="Where, when and who. The crew get it on their phones."
      footer={
        <>
          {step > 1 ? (
            <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(step - 1)}>Back</Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          )}
          {step < STEPS.length ? (
            <Button variant="primary" iconRight={ChevronRight} disabled={!canGoOn} onClick={() => setStep(step + 1)}>
              {step === 3 && techIds.length === 0 ? 'Pick at least one person' : 'Next'}
            </Button>
          ) : (
            <Button variant="primary" icon={Check} loading={saving} disabled={!leadId} onClick={save}>Save job</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-section">
        <Steps steps={STEPS} current={step} onSelect={setStep} />
        {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger">{error}</p>}
        {step === 1 && <OnSiteJobStep value={place} onChange={setPlace} />}
        {step === 2 && <OnSiteTimeStep value={time} onChange={setTime} />}
        {step === 3 && (
          <>
            <TeamSelectionDirectory
              profiles={profiles}
              selectedTechIds={techIds}
              onToggleTech={toggleTech}
              leadTechId={leadId}
              onSelectLead={setLeadId}
              targetDate={time.date}
              startTime={time.startTime}
              endTime={time.endTime}
              existingSchedules={existingSchedules}
              requireLead
              hideCasualHelpers={false}
            />
            <TemporaryWorkerPicker helpers={casualHelpers} selected={helperIds} onChange={setHelperIds} onAddNew={onOpenCasualRegisterModal} />
          </>
        )}
        {step === 4 && (
          <OnSiteReviewStep
            place={place}
            time={time}
            leadName={profiles.find((p) => p.id === leadId)?.full_name ?? null}
            crewCount={techIds.filter((id) => id !== leadId).length}
            helperCount={helperIds.length}
          />
        )}
      </div>
    </Drawer>
  )
}
