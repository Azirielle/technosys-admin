// InventoryBoard: the Coordinator's Inventory page — tools in the warehouse, and tools lent out to crews.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePageCommand } from '@/components/commands/pageCommands'
import { Box, Package, Plus, Search, ShieldAlert, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getTechnicians } from '@/app/actions/inventory'
import { Button, Input, Page, PageHeader, Pagination, Select, StatRow, StatTile, TableContainer, Tabs, useToast } from '@/components/ui'
import { ToolsTable } from './ToolsTable'
import { BorrowingsTable } from './BorrowingsTable'
import { ToolFormModal } from './ToolFormModal'
import { LendToolModal } from './LendToolModal'
import { ReturnToolModal } from './ReturnToolModal'
import { BorrowingDetailModal } from './BorrowingDetailModal'
import { DeleteToolModal } from './DeleteToolModal'
import { CATEGORIES, LOW_STOCK, isOverdue, type Borrowing, type Person, type Tool } from './types'

type Tab = 'tools' | 'borrowed'
type BorrowFilter = 'checked_out' | 'overdue' | 'returned' | 'problems' | 'all'
const PER_PAGE = 10

const BORROW_EMPTY: Record<BorrowFilter, string> = {
  checked_out: 'No tools are out with crews right now.',
  overdue: 'Nothing is overdue.',
  returned: 'No tools have been returned yet.',
  problems: 'No damaged or lost tools.',
  all: 'Lend a tool from the Tools tab and it shows up here.',
}

export function InventoryBoard() {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [tools, setTools] = useState<Tool[]>([])
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  // Open "Tool problem" reports from the phone, by person and tool name → what's wrong
  const [reports, setReports] = useState<Map<string, string>>(new Map())
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('tools')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [borrowFilter, setBorrowFilter] = useState<BorrowFilter>('checked_out')
  const [page, setPage] = useState(1)
  const [toolForm, setToolForm] = useState<{ open: boolean; tool: Tool | null }>({ open: false, tool: null })
  const [lending, setLending] = useState<Tool | null>(null)
  const [deleting, setDeleting] = useState<Tool | null>(null)
  const [returning, setReturning] = useState<Borrowing | null>(null)
  const [viewing, setViewing] = useState<Borrowing | null>(null)

  // Quick actions and the N shortcut: add a tool, or open "Lend" for a tool once the list has loaded.
  const [pendingLend, setPendingLend] = useState<string | null>(null)
  usePageCommand(['new', 'lend'], (command, id) => {
    if (command === 'new') setToolForm({ open: true, tool: null })
    else if (id) setPendingLend(id)
  })
  if (pendingLend && !loading) {
    // Adjusting state while rendering (React's pattern for this): runs once, when the tools are ready.
    setPendingLend(null)
    const tool = tools.find((t) => t.id === pendingLend)
    if (tool) {
      setTab('tools')
      setLending(tool)
    }
  }

  const load = useCallback(async () => {
    const [toolsRes, borrowRes, staff, reportRes] = await Promise.all([
      supabase.from('tools').select('*').order('name'),
      supabase
        .from('tool_borrowings')
        .select('*, profiles!technician_id(full_name, role, avatar_url), tool_catalog:tools!tool_id(name, category, image_url, serial_number)')
        .order('handed_over_at', { ascending: false }),
      getTechnicians(),
      supabase.from('tickets').select('employee_id, title, description').eq('category', 'Equipment / Tools').neq('status', 'resolved'),
    ])
    if (toolsRes.error || borrowRes.error) toast.error("Couldn't load the inventory. Refresh the page.")
    setTools((toolsRes.data ?? []) as Tool[])
    setBorrowings((borrowRes.data ?? []) as unknown as Borrowing[])
    setPeople((staff ?? []) as Person[])
    // shortcut: matched by the ticket title "Tool problem: <name>" (the phone's report has no borrowing id)
    setReports(new Map((reportRes.data ?? []).map((r) => [`${r.employee_id}|${r.title.replace(/^Tool problem: /, '')}`,
      r.description.split('\n').find((l: string) => l.startsWith('Problem: '))?.slice(9) ?? 'Problem reported'])))
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    load()
  }, [load])

  function done(message: string, close: () => void) {
    close()
    toast.success(message)
    load()
  }

  const totals = useMemo(() => {
    const out = borrowings.filter((b) => b.status === 'checked_out')
    return {
      owned: tools.reduce((n, t) => n + (t.total_stock || 0), 0),
      inWarehouse: tools.reduce((n, t) => n + (t.available_stock || 0), 0),
      low: tools.filter((t) => t.status === 'active' && t.available_stock <= LOW_STOCK).length,
      out: out.reduce((n, b) => n + (b.quantity || 1), 0),
      overdue: out.filter(isOverdue).length,
      problems: borrowings.filter((b) => b.status === 'damaged' || b.status === 'lost').length,
    }
  }, [tools, borrowings])

  const q = search.trim().toLowerCase()
  const shownTools = tools.filter(
    (t) => (!category || t.category === category) && (!q || [t.name, t.description, t.serial_number, t.category].some((v) => (v || '').toLowerCase().includes(q))),
  )
  const shownBorrowings = borrowings.filter((b) => {
    const matchFilter =
      borrowFilter === 'all' ||
      (borrowFilter === 'overdue' ? isOverdue(b) : borrowFilter === 'problems' ? b.status === 'damaged' || b.status === 'lost' : b.status === borrowFilter)
    return matchFilter && (!q || [b.tool_catalog?.name, b.profiles?.full_name, b.tool_catalog?.serial_number].some((v) => (v || '').toLowerCase().includes(q)))
  })
  const rows = tab === 'tools' ? shownTools.length : shownBorrowings.length
  const show = (t: Tab, filter?: BorrowFilter) => { setTab(t); if (filter) setBorrowFilter(filter); setSearch(''); setPage(1) }

  return (
    <Page wide>
      <PageHeader
        title="Inventory"
        subtitle="Tools in the warehouse, and who has them. Lend a tool from the Tools tab; check it in from Borrowed."
        actions={<Button variant="primary" icon={Plus} onClick={() => setToolForm({ open: true, tool: null })}>Add tool</Button>}
      />

      {/* Each number opens the list behind it */}
      <StatRow>
        <StatTile loading={loading} icon={Package} label="Tools owned" onClick={() => show('tools')} value={totals.owned} hint={`${tools.length} kinds of tools`} />
        <StatTile loading={loading} icon={Box} label="In the warehouse" onClick={() => show('tools')} value={totals.inWarehouse} hint={totals.low ? `${totals.low} running low` : 'Stock looks fine'} tone={totals.low ? 'warning' : 'success'} />
        <StatTile loading={loading} icon={Wrench} label="Out with crews" onClick={() => show('borrowed', 'checked_out')} value={totals.out} hint={totals.overdue ? `${totals.overdue} overdue` : 'None overdue'} tone={totals.overdue ? 'danger' : 'neutral'} />
        <StatTile loading={loading} icon={ShieldAlert} label="Damaged or lost" onClick={() => show('borrowed', 'problems')} value={totals.problems} hint="Checked in as damaged or lost" tone={totals.problems ? 'warning' : 'neutral'} />
      </StatRow>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Inventory section"
          value={tab}
          onChange={(v) => { setTab(v); setPage(1) }}
          items={[
            { value: 'tools', label: 'Tools', count: tools.length },
            { value: 'borrowed', label: 'Borrowed', count: totals.out },
          ]}
        />
        {tab === 'tools' ? (
          <Select aria-label="Category" className="w-52" placeholder="All categories" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        ) : (
          <Select
            aria-label="Show"
            className="w-52"
            value={borrowFilter}
            onChange={(e) => { setBorrowFilter(e.target.value as BorrowFilter); setPage(1) }}
            options={[
              { value: 'checked_out', label: 'Out now' },
              { value: 'overdue', label: `Overdue (${totals.overdue})` },
              { value: 'problems', label: 'Damaged or lost' },
              { value: 'returned', label: 'Returned' },
              { value: 'all', label: 'All' },
            ]}
          />
        )}
        <Input icon={Search} className="ml-auto w-full sm:w-64" aria-label="Search" placeholder={tab === 'tools' ? 'Search tool or tag' : 'Search tool or person'} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <TableContainer>
        {tab === 'tools' ? (
          <ToolsTable
            tools={shownTools.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
            loading={loading}
            filtered={Boolean(q || category)}
            onLend={setLending}
            onEdit={(t) => setToolForm({ open: true, tool: t })}
            onDelete={setDeleting}
          />
        ) : (
          <BorrowingsTable
            borrowings={shownBorrowings.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
            loading={loading}
            emptyText={q ? 'Try another search.' : BORROW_EMPTY[borrowFilter]}
            onOpen={setViewing}
            onReturn={setReturning}
            reports={reports}
          />
        )}
        {rows > PER_PAGE && (
          <Pagination currentPage={page} totalPages={Math.ceil(rows / PER_PAGE)} totalItems={rows} itemsPerPage={PER_PAGE} onPageChange={setPage} itemNamePlural={tab === 'tools' ? 'tools' : 'records'} />
        )}
      </TableContainer>

      <ToolFormModal isOpen={toolForm.open} tool={toolForm.tool} onClose={() => setToolForm({ open: false, tool: null })} onSaved={() => done('Tool saved', () => setToolForm({ open: false, tool: null }))} />
      <LendToolModal tool={lending} people={people} onClose={() => setLending(null)} onDone={() => done('Tool lent', () => setLending(null))} />
      <DeleteToolModal tool={deleting} onClose={() => setDeleting(null)} onDone={() => done('Tool deleted', () => setDeleting(null))} />
      <BorrowingDetailModal borrowing={returning ? null : viewing} onClose={() => setViewing(null)} onReturn={(b) => { setViewing(null); setReturning(b) }} />
      <ReturnToolModal borrowing={returning} onClose={() => setReturning(null)} onDone={() => done('Tool checked in', () => setReturning(null))} />
    </Page>
  )
}
