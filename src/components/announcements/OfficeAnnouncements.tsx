// OfficeAnnouncements: the newest announcements meant for office staff (or everyone), on each office home page (C13).
import { createClient } from '@/lib/supabase/server'
import { Badge, ListCard, ListRow } from '@/components/ui'
import { formatAgo } from '@/lib/format'
import { PRIORITIES } from './types'

export async function OfficeAnnouncements({ href }: { href: string }) {
  const supabase = await createClient()
  const { data } = await supabase.from('announcements').select('id, title, content, priority, created_at')
    .eq('status', 'published').in('audience', ['office_staff', 'all']).order('created_at', { ascending: false }).limit(3)
  const items = data ?? []
  return (
    <ListCard title="Announcements" count={items.length} href={href} linkLabel="See all" empty="No announcements for office staff.">
      {items.map((a) => {
        const p = PRIORITIES.find((x) => x.value === a.priority)
        return (
          <ListRow key={a.id} primary={a.title} secondary={a.content.slice(0, 90)} right={a.created_at ? formatAgo(a.created_at) : undefined}
            leading={p && a.priority !== 'normal' ? <Badge tone={p.tone}>{p.label}</Badge> : undefined} />
        )
      })}
    </ListCard>
  )
}
