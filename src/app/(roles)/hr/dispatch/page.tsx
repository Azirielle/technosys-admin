// Jobs for HR, opened only when the CEO gives HR temporary access. HR can look; the Coordinator schedules.
import { JobsBoard } from '@/components/jobs/JobsBoard'

export default function HRDispatchPage() {
  return <JobsBoard readOnly />
}
