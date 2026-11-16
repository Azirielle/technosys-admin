// ActingLeadPrompt: a job whose lead hasn't timed in 15 minutes after the start (or is on leave). Suggests
// the most senior technician on the crew who is in; one tap names them acting lead and pushes to them.
'use client'

import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { setActingLead } from '@/app/actions/today'
import { Button, Select, useToast } from '@/components/ui'
import type { TodayJob } from './todayData'
import type { Row } from './todayStatus'

export function ActingLeadPrompt({ job, rows, onDone }: { job: TodayJob; rows: Row[]; onDone: () => void }) {
  const toast = useToast()
  const lead = job.members.find((m) => m.role === 'lead')
  // Technicians on this job who are in, seniors first
  const candidates = rows
    .filter((r) => r.job?.id === job.id && r.role !== 'lead' && r.role !== 'helper' && r.day && !r.day.time_out)
    .sort((a, b) => Number(b.level === 'senior') - Number(a.level === 'senior'))
  const [pick, setPick] = useState(candidates[0]?.person_id ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await setActingLead(job.id, pick, job.client_name)
    setSaving(false)
    if (!res.ok) return toast.error(res.error)
    toast.success('Acting lead named. They got a push.')
    onDone()
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-warning/40 bg-warning-soft p-4">
      <UserCheck className="size-5 shrink-0 text-warning" aria-hidden />
      <p className="min-w-0 flex-1 text-small text-ink">
        <span className="font-medium">{job.client_name}:</span> {lead?.name ?? 'The lead'} hasn't timed in.
        {candidates.length ? ' Name an acting lead from the crew who are in.' : ' Nobody else on the crew is in yet.'}
      </p>
      {candidates.length > 0 && (
        <>
          <Select size="sm" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Acting lead"
            options={candidates.map((c) => ({ value: c.person_id, label: `${c.name}${c.level === 'senior' ? ' (senior)' : ''}` }))} />
          <Button size="sm" variant="primary" loading={saving} disabled={!pick} onClick={save}>Make acting lead</Button>
        </>
      )}
    </div>
  )
}
