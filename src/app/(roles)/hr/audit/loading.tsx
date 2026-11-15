// Shown while this page loads.
import { TablePageSkeleton } from '@/components/loading/PageSkeletons'

export default function Loading() {
  return <TablePageSkeleton label="Loading the DTR" stats cols={7} />
}
