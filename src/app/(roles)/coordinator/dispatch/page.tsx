// The old Scheduling page moved to Jobs (Work v2). Old links and bookmarks land there.
import { redirect } from 'next/navigation'

export default function SchedulingPage() {
  redirect('/coordinator/jobs')
}
