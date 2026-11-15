// PageSkeletons: whole-page loading shapes used by the loading.tsx files (overview, table page, tickets).
import {
  Page,
  Skeleton,
  SkeletonArea,
  SkeletonListCard,
  SkeletonPageHeader,
  SkeletonStatRow,
  SkeletonTable,
  SkeletonTabs,
} from '@/components/ui'

/** The /ceo, /hr and /coordinator home pages: header, four numbers, four lists. */
export function OverviewSkeleton() {
  return (
    <Page>
      <SkeletonArea label="Loading today's overview" className="flex flex-col gap-section">
        <SkeletonPageHeader actions={false} />
        <SkeletonStatRow />
        <div className="grid grid-cols-1 gap-section lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => <SkeletonListCard key={i} />)}
        </div>
      </SkeletonArea>
    </Page>
  )
}

/** Most pages: header, optional numbers, tabs, one big table. */
export function TablePageSkeleton({
  label = 'Loading',
  stats = false,
  wide = true,
  cols = 5,
}: {
  label?: string
  stats?: boolean
  wide?: boolean
  cols?: number
}) {
  return (
    <Page wide={wide}>
      <SkeletonArea label={label} className="flex flex-col gap-section">
        <SkeletonPageHeader />
        {stats && <SkeletonStatRow />}
        <SkeletonTabs />
        <SkeletonTable cols={cols} rows={7} />
      </SkeletonArea>
    </Page>
  )
}

/** Live map: one big block where the map goes. */
export function MapSkeleton() {
  return (
    <SkeletonArea label="Loading the map" className="h-full p-4">
      <Skeleton className="h-full w-full rounded-card" />
    </SkeletonArea>
  )
}

/** Tickets: list on the left, conversation on the right. */
export function TicketsSkeleton() {
  return (
    <div className="flex h-full flex-col gap-section px-page py-page-y">
      <SkeletonArea label="Loading tickets" className="flex min-h-0 flex-1 flex-col gap-section">
        <SkeletonPageHeader actions={false} />
        <SkeletonTabs />
        <div className="flex min-h-0 flex-1 gap-section">
          <div className="flex w-full flex-col gap-4 rounded-card bg-surface p-card shadow-card md:w-[360px] lg:w-[400px]">
            {Array.from({ length: 5 }, (_, i) => <TicketRowSkeleton key={i} />)}
          </div>
          <div className="hidden flex-1 rounded-card bg-surface shadow-card md:block" />
        </div>
      </SkeletonArea>
    </div>
  )
}

/** One ticket in the left list. Also used by the list while it loads. */
export function TicketRowSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="size-8 shrink-0 rounded-pill" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-12 rounded-pill" />
    </div>
  )
}

/** Chat bubbles, alternating sides, while a conversation loads. */
export function ConversationSkeleton() {
  return (
    <SkeletonArea label="Loading conversation" className="flex flex-col gap-3">
      {[false, true, false].map((mine, i) => (
        <Skeleton key={i} className={mine ? 'ml-auto h-16 w-2/3 rounded-card' : 'h-14 w-1/2 rounded-card'} />
      ))}
    </SkeletonArea>
  )
}
