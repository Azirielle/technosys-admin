// PoliciesBoard: the HR "Policies" page — what needs action, every policy, and the handbook.
'use client'

import { useMemo, useState } from 'react'
import { usePageCommand } from '@/components/commands/pageCommands'
import { BookOpen, CheckCircle2, FileClock, Plus, ScrollText, Search, Users } from 'lucide-react'
import { dispatchPolicyReminder, forkPolicyRevision, submitPolicyForReview, type CompanyPolicy } from '@/app/actions/policies'
import { Button, Input, Page, PageHeader, Pagination, StatRow, StatTile, TableContainer, Tabs, useToast } from '@/components/ui'
import { usePolicies } from './usePolicies'
import { PolicyTable } from './PolicyTable'
import { PolicyDrawer } from './PolicyDrawer'
import { PolicyFormModal } from './PolicyFormModal'
import { ArchivePolicyModal, PublishPolicyModal, RequestChangesModal } from './PolicyDecisionModals'
import { HandbookModal } from './HandbookModal'
import { needsCoordinatorReview } from './policyLabels'

type Filter = 'attention' | 'active' | 'drafts' | 'archived' | 'all'
type Dialog = 'none' | 'form' | 'publish' | 'changes' | 'archive' | 'handbook'
const PER_PAGE = 8

const EMPTY: Record<Filter, [string, string]> = {
  attention: ["You're all caught up", 'No drafts, approvals or missing signatures.'],
  active: ['Nothing published', 'Publish a policy and staff can sign it in the app.'],
  drafts: ['No drafts', 'Start a new policy with New policy.'],
  archived: ['Nothing archived', 'Old versions show up here.'],
  all: ['No policies yet', 'Start with New policy.'],
}

export function PoliciesBoard() {
  const toast = useToast()
  const { policies, signatures, loading, load } = usePolicies()
  const [filter, setFilter] = useState<Filter>('attention')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>('none')
  const [editing, setEditing] = useState<CompanyPolicy | null>(null)
  // Quick actions and the N shortcut: start a new policy, or open one by id.
  usePageCommand(['new', 'open'], (command, id) => {
    if (command === 'new') {
      setEditing(null)
      setDialog('form')
    } else if (id) setOpenId(id)
  })
  const [busy, setBusy] = useState(false)

  const open = policies.find((p) => p.id === openId) ?? null
  const unsignedOf = (p: CompanyPolicy) => signatures[p.id]?.unsigned.length ?? 0
  const needsAction = (p: CompanyPolicy) => p.status === 'draft' || p.status === 'under_review' || (p.status === 'active' && p.is_mandatory && unsignedOf(p) > 0)

  const counts = useMemo(
    () => ({
      attention: policies.filter(needsAction).length,
      active: policies.filter((p) => p.status === 'active').length,
      drafts: policies.filter((p) => p.status === 'draft' || p.status === 'under_review').length,
      waiting: policies.filter((p) => p.status === 'under_review').length,
      archived: policies.filter((p) => p.status === 'archived').length,
      unsigned: policies.filter((p) => p.status === 'active' && p.is_mandatory).reduce((n, p) => n + unsignedOf(p), 0),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policies, signatures],
  )

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    const order = { under_review: 0, draft: 1, active: 2, archived: 3 }
    return policies
      .filter((p) => {
        if (filter === 'attention' && !needsAction(p)) return false
        if (filter === 'active' && p.status !== 'active') return false
        if (filter === 'drafts' && p.status !== 'draft' && p.status !== 'under_review') return false
        if (filter === 'archived' && p.status !== 'archived') return false
        return !q || [p.title, p.summary, p.category].some((v) => (v || '').toLowerCase().includes(q))
      })
      .sort((a, b) => (filter === 'attention' ? order[a.status] - order[b.status] : a.title.localeCompare(b.title)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policies, signatures, filter, search])

  /** Runs a server action, shows the result and keeps the panel on the returned policy. */
  async function run(task: () => Promise<{ success: boolean; error?: string; policy?: CompanyPolicy }>, done: string) {
    setBusy(true)
    const res = await task()
    setBusy(false)
    if (!res.success) return toast.error(res.error || 'Something went wrong. Try again.')
    toast.success(done)
    await load()
    if (res.policy) setOpenId(res.policy.id)
  }

  function finished(p: CompanyPolicy, message: string) {
    setDialog('none')
    toast.success(message)
    load()
    setOpenId(p.id)
  }

  const actions = {
    onEdit: () => { setEditing(open); setDialog('form') },
    onSubmit: () => {
      if (!open) return
      if (!open.summary?.trim() || !open.content_markdown?.trim()) return toast.error('Add a summary and the policy text before sending it for approval.')
      const note = needsCoordinatorReview(open) ? 'Waiting for the Coordinator to check the field work rules.' : 'Waiting for approval.'
      run(() => submitPolicyForReview(open.id, note), 'Sent for approval')
    },
    onPublish: () => setDialog('publish'),
    onRequestChanges: () => setDialog('changes'),
    onRevise: () => open && run(() => forkPolicyRevision(open.id), 'New draft version made'),
    onArchive: () => setDialog('archive'),
    onRemind: () => {
      const people = open ? signatures[open.id]?.unsigned ?? [] : []
      if (!open || people.length === 0) return
      run(async () => ({ ...(await dispatchPolicyReminder(open.id, people.map((s) => s.id))), policy: open }), `Reminder sent to ${people.length} ${people.length === 1 ? 'person' : 'people'}`)
    },
  }

  const overlay = dialog !== 'none'
  const pageRows = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <Page wide>
      <PageHeader
        title="Policies"
        subtitle="Write policies, get them approved, publish them, and see who has signed."
        actions={
          <>
            <Button icon={BookOpen} onClick={() => setDialog('handbook')}>Handbook</Button>
            <Button variant="primary" icon={Plus} onClick={() => { setEditing(null); setDialog('form') }}>New policy</Button>
          </>
        }
      />

      <StatRow>
        <StatTile loading={loading} icon={ScrollText} label="Published" value={counts.active} hint={`${counts.archived} archived`} />
        <StatTile loading={loading} icon={FileClock} label="Waiting for approval" value={counts.waiting} hint={counts.waiting ? 'Read and decide' : 'Nothing waiting'} tone={counts.waiting ? 'warning' : 'success'} />
        <StatTile loading={loading} icon={Users} label="Signatures missing" value={counts.unsigned} hint="Across required policies" tone={counts.unsigned ? 'warning' : 'success'} />
        <StatTile loading={loading} icon={CheckCircle2} label="Drafts" value={counts.drafts - counts.waiting} hint="Still being written" />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Show"
          value={filter}
          onChange={(f) => { setFilter(f); setPage(1) }}
          items={[
            { value: 'attention', label: 'Needs action', count: counts.attention },
            { value: 'active', label: 'Published', count: counts.active },
            { value: 'drafts', label: 'Drafts and approval', count: counts.drafts },
            { value: 'archived', label: 'Archived', count: counts.archived },
            { value: 'all', label: 'All', count: policies.length },
          ]}
        />
        <Input icon={Search} className="w-full sm:w-64" aria-label="Search policies" placeholder="Search policies" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <TableContainer>
        <PolicyTable policies={pageRows} signatures={signatures} loading={loading} emptyTitle={search ? 'No policies match' : EMPTY[filter][0]} emptyText={search ? 'Try another search.' : EMPTY[filter][1]} onOpen={(p) => setOpenId(p.id)} />
        {shown.length > PER_PAGE && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(shown.length / PER_PAGE)}
            totalItems={shown.length}
            itemsPerPage={PER_PAGE}
            onPageChange={setPage}
            itemNamePlural="policies"
          />
        )}
      </TableContainer>

      <PolicyDrawer policy={overlay ? null : open} signatures={open ? signatures[open.id] : undefined} busy={busy} onClose={() => setOpenId(null)} actions={actions} />
      <PolicyFormModal isOpen={dialog === 'form'} policy={editing} onClose={() => setDialog('none')} onSaved={(p) => finished(p, editing ? 'Draft saved' : 'Draft created')} />
      <PublishPolicyModal policy={dialog === 'publish' ? open : null} onClose={() => setDialog('none')} onDone={(p) => finished(p, 'Policy published')} />
      <RequestChangesModal policy={dialog === 'changes' ? open : null} onClose={() => setDialog('none')} onDone={(p) => finished(p, 'Sent back to draft')} />
      <ArchivePolicyModal policy={dialog === 'archive' ? open : null} onClose={() => setDialog('none')} onDone={(p) => finished(p, 'Policy archived')} />
      <HandbookModal isOpen={dialog === 'handbook'} policies={policies} onClose={() => setDialog('none')} />
    </Page>
  )
}
