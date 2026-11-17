// Scheduling for HR, opened only when the CEO gives HR temporary access. HR can look; the Coordinator schedules.
import { ScheduleBoard } from '@/components/schedule/ScheduleBoard'

export default function HRDispatchPage() {
  return <ScheduleBoard readOnly />
}
