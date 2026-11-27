// FilesBoard: the HR "201 files" page — who has a complete file, who's missing documents, who has warnings.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePageCommand } from '@/components/commands/pageCommands'
import { CheckCircle2, Download, FileWarning, Search, ShieldAlert, UserPlus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Page, PageHeader, Pagination, StatRow, StatTile, TableContainer, Tabs, useToast } from '@/components/ui'
import { FilesTable } from './FilesTable'
import { EmployeeFileDrawer } from './EmployeeFileDrawer'
import { WarningModal } from './WarningModal'
import { EmployeeDetailsModal, type DetailsForm } from './EmployeeDetailsModal'
import { addWarning, exportFilesCsv, loadEmployeeFiles, requestMissingDocuments, saveEmployeeDetails, setDocumentReceived } from './filesActions'
import { fileStatus, type DocKey, type EmployeeFile } from './requirements'
import { loadPendingPhoneRequests } from './signInActions'
import { NewAccountModal } from './NewAccountModal'
import { ArchiveAccountModal } from './ArchiveAccountModal'
import { archiveAccount, createAccount, restoreAccount, type NewAccount } from '@/app/actions/accounts'

type Filter = 'all' | 'incomplete' | 'warnings' | 'complete' | 'phone' | 'archived'
const FILTERS: Filter[] = ['all', 'incomplete', 'warnings', 'complete', 'phone', 'archived']
const PER_PAGE = 8

function matches(emp: EmployeeFile, filter: Filter, phoneRequests: Set<string>) {
  // Archived people show only on their own tab.
  if ((emp.lifecycle_status === 'archived') !== (filter === 'archived')) return false
  if (filter === 'archived') return true
  if (filter === 'phone') return phoneRequests.has(emp.id)
  const s = fileStatus(emp)
  if (filter === 'incomplete') return !s.complete
  if (filter === 'complete') return s.complete
  if (filter === 'warnings') return emp.warnings.length > 0
  return true
}

/** show: the tab to open on (task 5: "Incomplete 201 files" on the HR overview opens ?show=incomplete) */
export function FilesBoard({ show }: { show?: string }) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [employees, setEmployees] = useState<EmployeeFile[]>([])
  const [loading, setLoading] = useState(true)
  const [phoneRequests, setPhoneRequests] = useState<Set<string>>(new Set())
  const [chosenFilter, setFilter] = useState<Filter>(FILTERS.includes(show as Filter) ? (show as Filter) : 'all')
  // Once the last phone request is handled (or the last archived person restored) its tab disappears: show everyone.
  const emptyTab = (chosenFilter === 'phone' && phoneRequests.size === 0) || (chosenFilter === 'archived' && !employees.some((e) => e.lifecycle_status === 'archived'))
  const filter: Filter = emptyTab ? 'all' : chosenFilter
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  // Quick actions: open a person's 201 file by id.
  usePageCommand(['open'], (_command, id) => id && setOpenId(id))
  const [savingKey, setSavingKey] = useState<DocKey | null>(null)
  const [reminding, setReminding] = useState(false)
  const [warningOpen, setWarningOpen] = useState(false)
  const [savingWarning, setSavingWarning] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [files, requests] = await Promise.all([loadEmployeeFiles(supabase), loadPendingPhoneRequests(supabase)])
      setEmployees(files)
      setPhoneRequests(requests)
    } catch (err) {
      toast.error(`Couldn't load 201 files: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    load()
  }, [load])

  const open = employees.find((e) => e.id === openId) ?? null
  const counts = useMemo(
    () => ({
      incomplete: employees.filter((e) => matches(e, 'incomplete', phoneRequests)).length,
      warnings: employees.filter((e) => matches(e, 'warnings', phoneRequests)).length,
      complete: employees.filter((e) => matches(e, 'complete', phoneRequests)).length,
      all: employees.filter((e) => matches(e, 'all', phoneRequests)).length,
      archived: employees.filter((e) => e.lifecycle_status === 'archived').length,
    }),
    [employees, phoneRequests],
  )
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = employees.filter((e) => matches(e, filter, phoneRequests) && (!q || e.full_name.toLowerCase().includes(q)))
    // When chasing missing documents, show the emptiest files first.
    return filter === 'incomplete' ? [...list].sort((a, b) => fileStatus(a).done - fileStatus(b).done) : list
  }, [employees, filter, search, phoneRequests])

  async function run(task: () => Promise<void>, done: string, failed: string) {
    try {
      await task()
      toast.success(done)
      await load()
      return true
    } catch (err) {
      toast.error(`${failed}: ${(err as Error).message}`)
      return false
    }
  }

  async function toggleDocument(key: DocKey, received: boolean) {
    if (!open) return
    setSavingKey(key)
    await run(() => setDocumentReceived(supabase, open, key, received), received ? 'Marked as received' : 'Marked as missing', "Couldn't save")
    setSavingKey(null)
  }

  async function remind() {
    if (!open) return
    setReminding(true)
    await run(() => requestMissingDocuments(open), `Reminder sent to ${open.full_name}'s phone`, "Couldn't send the reminder")
    setReminding(false)
  }

  async function saveWarning(level: string, subject: string, details: string, date: string) {
    if (!open) return
    setSavingWarning(true)
    if (await run(() => addWarning(supabase, open, level, subject, details, date), 'Warning saved', "Couldn't save the warning")) setWarningOpen(false)
    setSavingWarning(false)
  }

  async function saveDetails(form: DetailsForm) {
    if (!open) return
    setSavingDetails(true)
    const problem = await saveEmployeeDetails(supabase, open, form)
    setSavingDetails(false)
    setDetailsError(problem)
    if (problem) return
    setDetailsOpen(false)
    toast.success('Details saved')
    load()
  }

  async function makeAccount(form: NewAccount) {
    setAccountSaving(true)
    const res = await createAccount(form)
    setAccountSaving(false)
    setAccountError(res.error ?? null)
    if (res.error) return
    setNewOpen(false)
    toast.success('Account made. Set their PIN in Sign-in.')
    await load()
    setOpenId(res.id ?? null)
  }

  async function archiveOrRestore() {
    if (!open) return
    const restoring = open.lifecycle_status === 'archived'
    setAccountSaving(true)
    const res = await (restoring ? restoreAccount(open.id) : archiveAccount(open.id))
    setAccountSaving(false)
    setAccountError(res.error ?? null)
    if (res.error) return
    setArchiveOpen(false)
    toast.success(restoring ? `${open.full_name} can sign in again` : `${open.full_name} is archived`)
    setOpenId(null)
    load()
  }

  const overlayOpen = warningOpen || detailsOpen || archiveOpen

  return (
    <Page wide>
      <PageHeader
        title="201 files"
        subtitle="Each technician's and helper's documents, warnings and mobile sign-in (PIN and phone). Mark a document once HR has the copy."
        actions={
          <>
            <Button icon={Download} onClick={() => exportFilesCsv(employees)} disabled={loading || employees.length === 0}>Export CSV</Button>
            <Button variant="primary" icon={UserPlus} onClick={() => { setAccountError(null); setNewOpen(true) }}>New account</Button>
          </>
        }
      />

      <StatRow>
        <StatTile loading={loading} icon={Users} label="Field staff" onClick={() => setFilter('all')} value={counts.all} hint="Technicians and helpers" />
        <StatTile loading={loading} icon={FileWarning} label="Missing documents" onClick={() => setFilter('incomplete')} value={counts.incomplete} hint={counts.incomplete ? 'Files still incomplete' : 'Every file is complete'} tone={counts.incomplete ? 'warning' : 'success'} />
        <StatTile loading={loading} icon={ShieldAlert} label="With warnings" onClick={() => setFilter('warnings')} value={counts.warnings} hint={counts.warnings ? 'Have at least one warning' : 'No warnings on record'} />
        <StatTile loading={loading} icon={CheckCircle2} label="Complete" onClick={() => setFilter('complete')} value={counts.complete} hint="All six documents received" tone={counts.complete ? 'success' : 'neutral'} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Show"
          value={filter}
          onChange={(v) => {
            setFilter(v)
            setPage(1)
          }}
          items={[
            { value: 'all', label: 'Everyone', count: counts.all },
            { value: 'incomplete', label: 'Missing documents', count: counts.incomplete },
            { value: 'warnings', label: 'With warnings', count: counts.warnings },
            { value: 'complete', label: 'Complete', count: counts.complete },
            ...(phoneRequests.size ? [{ value: 'phone' as const, label: 'New phone requests', count: phoneRequests.size }] : []),
            ...(counts.archived ? [{ value: 'archived' as const, label: 'Archived', count: counts.archived }] : []),
          ]}
        />
        <Input icon={Search} className="w-full sm:w-64" placeholder="Search name" aria-label="Search staff" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <TableContainer>
        <FilesTable employees={shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)} loading={loading} onOpen={(e) => setOpenId(e.id)} />
        {shown.length > PER_PAGE && (
          <Pagination currentPage={page} totalPages={Math.ceil(shown.length / PER_PAGE)} totalItems={shown.length} itemsPerPage={PER_PAGE} onPageChange={setPage} itemNamePlural="staff" />
        )}
      </TableContainer>

      <EmployeeFileDrawer
        employee={overlayOpen ? null : open}
        savingKey={savingKey}
        reminding={reminding}
        onClose={() => setOpenId(null)}
        onToggleDocument={toggleDocument}
        onRemind={remind}
        onEditDetails={() => {
          setDetailsError(null)
          setDetailsOpen(true)
        }}
        onArchive={() => { setAccountError(null); setArchiveOpen(true) }}
        onAddWarning={() => setWarningOpen(true)}
        hasPhoneRequest={!!open && phoneRequests.has(open.id)}
        onSignInChanged={load}
      />
      <WarningModal employee={warningOpen ? open : null} saving={savingWarning} onClose={() => setWarningOpen(false)} onSave={saveWarning} />
      <EmployeeDetailsModal employee={detailsOpen ? open : null} saving={savingDetails} error={detailsError} onClose={() => setDetailsOpen(false)} onSave={saveDetails} />
      <NewAccountModal open={newOpen} saving={accountSaving} error={accountError} onClose={() => setNewOpen(false)} onSave={makeAccount} />
      <ArchiveAccountModal employee={archiveOpen ? open : null} saving={accountSaving} error={accountError} onClose={() => setArchiveOpen(false)} onConfirm={archiveOrRestore} />
    </Page>
  )
}
