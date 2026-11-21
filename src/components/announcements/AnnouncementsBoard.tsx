// AnnouncementsBoard: the Announcements page for CEO, HR and the Coordinator — list, write, edit, remove.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePageCommand } from '@/components/commands/pageCommands'
import { Plus, Search } from 'lucide-react'
import { getAudienceCounts, listAnnouncements } from '@/app/actions/announcements'
import { logAdminActivity } from '@/lib/auditLogger'
import type { RoleKey } from '@/lib/overrides'
import { Button, Input, Page, PageHeader, Pagination, Select, TableContainer, Tabs, useToast } from '@/components/ui'
import { AnnouncementList } from './AnnouncementList'
import { AnnouncementForm } from './AnnouncementForm'
import { AnnouncementDetailModal } from './AnnouncementDetailModal'
import { PRIORITIES, type Announcement, type AnnouncementAudience, type AnnouncementStatus } from './types'

type Filter = 'all' | AnnouncementStatus
const PER_PAGE = 8

export function AnnouncementsBoard({ currentRole, adminName, adminRoleLabel }: { currentRole: RoleKey | 'ceo'; adminName: string; adminRoleLabel: string }) {
  const toast = useToast()
  const [items, setItems] = useState<Announcement[]>([])
  const [counts, setCounts] = useState<Record<AnnouncementAudience, number>>({ all: 0, field_staff: 0, office_staff: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [priority, setPriority] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<Announcement | null>(null)
  const [form, setForm] = useState<{ open: boolean; item: Announcement | null }>({ open: false, item: null })

  const load = useCallback(async () => {
    const { data, error } = await listAnnouncements()
    if (error) toast.error(`Couldn't load announcements: ${error}`)
    setItems(data)
    setLoading(false)
  }, [toast])

  useEffect(() => {
    load()
    getAudienceCounts().then(setCounts).catch(() => {})
  }, [load])

  // Quick actions and the N shortcut open a new announcement straight away.
  usePageCommand(['new'], () => setForm({ open: true, item: null }))

  function log(action: string, target: string) {
    logAdminActivity({ adminName, adminRole: adminRoleLabel, adminRoleKey: currentRole, moduleKey: 'broadcaster', moduleName: 'Announcements', action, targetEntity: target })
  }

  const tally = useMemo(
    () => ({
      published: items.filter((a) => a.status === 'published').length,
      scheduled: items.filter((a) => a.status === 'scheduled').length,
      draft: items.filter((a) => a.status === 'draft').length,
    }),
    [items],
  )
  const q = search.trim().toLowerCase()
  const shown = items.filter(
    (a) =>
      (filter === 'all' || a.status === filter) &&
      (!priority || a.priority === priority) &&
      (!q || [a.title, a.content, a.author?.full_name].some((v) => (v || '').toLowerCase().includes(q))),
  )

  return (
    <Page wide>
      <PageHeader
        title="Announcements"
        subtitle="Share news with field and office staff. Published announcements show in the mobile app."
        actions={<Button variant="primary" icon={Plus} onClick={() => setForm({ open: true, item: null })}>New announcement</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Status"
          value={filter}
          onChange={(f) => { setFilter(f); setPage(1) }}
          items={[
            { value: 'all', label: 'All', count: items.length },
            { value: 'published', label: 'Published', count: tally.published },
            { value: 'scheduled', label: 'Scheduled', count: tally.scheduled },
            { value: 'draft', label: 'Drafts', count: tally.draft },
          ]}
        />
        <Select aria-label="Priority" className="w-44" placeholder="Any priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }} options={PRIORITIES} />
        <Input icon={Search} className="ml-auto w-full sm:w-64" aria-label="Search announcements" placeholder="Search announcements" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <TableContainer>
        <AnnouncementList
          items={shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
          loading={loading}
          emptyText={q || priority ? 'Try another search or priority.' : 'Write one with New announcement.'}
          onOpen={setViewing}
        />
        {shown.length > PER_PAGE && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(shown.length / PER_PAGE)}
            totalItems={shown.length}
            itemsPerPage={PER_PAGE}
            onPageChange={setPage}
            itemNamePlural="announcements"
          />
        )}
      </TableContainer>

      <AnnouncementDetailModal
        item={form.open ? null : viewing}
        onClose={() => setViewing(null)}
        onEdit={(a) => { setViewing(null); setForm({ open: true, item: a }) }}
        onRemoved={(a) => {
          setViewing(null)
          log('Removed announcement', `"${a.title}"`)
          toast.success('Announcement removed')
          load()
        }}
      />
      <AnnouncementForm
        isOpen={form.open}
        item={form.item}
        counts={counts}
        authorName={adminName}
        authorRole={adminRoleLabel || 'Office'}
        onClose={() => setForm({ open: false, item: null })}
        onSaved={(message, title, status) => {
          log(form.item ? 'Updated announcement' : status === 'draft' ? 'Saved announcement draft' : 'Published announcement', `"${title}" (${status})`)
          setForm({ open: false, item: null })
          toast.success(message)
          load()
        }}
      />
    </Page>
  )
}
