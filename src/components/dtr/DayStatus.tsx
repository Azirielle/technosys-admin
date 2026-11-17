// DayStatus: the status of one DTR day (Present, Late, Absent…) plus any warning flags (fake GPS, corrected…).
import { Briefcase, History, MapPinOff, ShieldAlert } from 'lucide-react'
import type { DailyAuditRecord } from '@/app/actions/audit'
import { Badge, StatusDot, type Tone } from '@/components/ui'

const STATUS: Record<DailyAuditRecord['status'], { label: string; tone: Tone }> = {
  present: { label: 'Present', tone: 'success' },
  late: { label: 'Late', tone: 'warning' },
  overtime: { label: 'Overtime', tone: 'info' },
  absent: { label: 'Absent', tone: 'danger' },
  approved_leave: { label: 'On leave', tone: 'info' },
  rest_day: { label: 'Rest day', tone: 'neutral' },
  holiday: { label: 'Holiday', tone: 'info' },
  off_duty: { label: 'Not yet', tone: 'neutral' },
  unclosed: { label: 'No time out', tone: 'danger' },
}

export function DayStatus({ day }: { day: DailyAuditRecord }) {
  const status = STATUS[day.status]
  let label = status.label
  if (day.status === 'late' && day.lateMinutes) label = `Late ${day.lateMinutes} min`
  if (day.status === 'approved_leave' && day.leaveType) label = `On ${day.leaveType} leave`
  if (day.status === 'holiday' && day.holidayName) label = day.holidayName

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusDot tone={status.tone}>{label}</StatusDot>
      {day.isMocked && (
        <Badge tone="danger" icon={MapPinOff} title="The phone reported a fake-GPS app during this punch">Fake GPS</Badge>
      )}
      {day.isSuspicious && (
        <Badge tone="warning" icon={ShieldAlert} title="Timed in outside the site with a selfie; not checked yet">Check punch</Badge>
      )}
      {day.hasLeaveCollision && (
        <Badge tone="warning" icon={Briefcase} title="Timed in on a day of approved leave">Worked on leave</Badge>
      )}
      {day.gpsAccuracy != null && day.gpsAccuracy > 65 && (
        <Badge title="GPS was not precise during this punch">GPS ±{Math.round(day.gpsAccuracy)} m</Badge>
      )}
      {(day.unapprovedOtHours ?? 0) >= 0.1 && (
        <Badge title="Worked past 8 hours without an approved overtime request, so it isn't counted as overtime">+{day.unapprovedOtHours} h not approved</Badge>
      )}
      {day.isCorrected && (
        <Badge icon={History} title={day.correctionDetails?.reason}>Corrected</Badge>
      )}
    </div>
  )
}
