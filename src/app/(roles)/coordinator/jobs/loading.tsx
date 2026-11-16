// Shown while the Jobs page loads.
import { TablePageSkeleton } from '@/components/loading/PageSkeletons'

export default function Loading() {
  return <TablePageSkeleton label="Loading jobs" stats />
}
