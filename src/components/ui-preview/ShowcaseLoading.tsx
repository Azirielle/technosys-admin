// ShowcaseLoading: the skeleton pieces on the /ui preview page, as a page looks while it loads.
import { CardHeader, SkeletonListCard, SkeletonStatRow, SkeletonTable, SkeletonText, StatTile } from '@/components/ui'

export function ShowcaseLoading() {
  return (
    <section className="flex flex-col gap-4">
      <CardHeader title="Loading (skeletons)" />
      <SkeletonStatRow count={2} />
      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Timed in" value={0} hint="StatTile with loading" loading />
        <div className="rounded-card bg-surface p-card shadow-card">
          <SkeletonText lines={4} />
        </div>
      </div>
      <SkeletonTable rows={3} cols={4} />
      <SkeletonListCard rows={3} />
    </section>
  )
}
