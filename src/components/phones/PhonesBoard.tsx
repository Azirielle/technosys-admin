// PhonesBoard: the HR "Work phones" page. Each technician and helper uses the app on one registered
// phone; here HR sees whose phone is whose, approves a switch to a new phone, or resets a phone.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, Search, Smartphone, SmartphoneNfc, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Modal, Page, PageHeader, Pagination, StatRow, StatTile, TableContainer, Tabs, useToast } from '@/components/ui'
import { decidePhoneRequest, resetPhone } from '@/components/files/signInActions'
import { PhonesTable } from './PhonesTable'
import { loadWorkPhones, phoneState, type PhoneState, type WorkPhoneRow } from './phonesActions'

type Filter = 'all' | PhoneState
const PER_PAGE = 8

export function PhonesBoard() {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [rows, setRows] = useState<WorkPhoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resetting, setResetting] = useState<WorkPhoneRow | null>(null)

  const load = useCallback(async () => {
    try {
      setRows(await loadWorkPhones(supabase))
    } catch (err) {
      toast.error(`Couldn't load work phones: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const c = { waiting: 0, registered: 0, none: 0 }
    rows.forEach((r) => c[phoneState(r)]++)
    // Someone waiting for a new phone usually still has their old one registered.
    return { ...c, withPhone: rows.filter((r) => r.phone).length }
  }, [rows])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter((r) => filter === 'all' || phoneState(r) === filter)
      .filter((r) => !q || r.full_name.toLowerCase().includes(q) || (r.phone?.device_name ?? '').toLowerCase().includes(q))
      // People waiting for HR come first.
      .sort((a, b) => Number(!!b.request) - Number(!!a.request))
  }, [rows, filter, search])

  async function run(row: WorkPhoneRow, task: () => Promise<void>, done: string) {
    setBusyId(row.id)
    try {
      await task()
      toast.success(done)
      await load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const first = (row: WorkPhoneRow) => row.full_name.split(' ')[0]

  function decide(row: WorkPhoneRow, approve: boolean) {
    if (!row.request) return
    run(
      row,
      () => decidePhoneRequest(supabase, row.request!.id, approve, row.full_name),
      approve ? `${first(row)}'s new phone is approved. The old one stops working.` : 'Request declined',
    )
  }

  async function confirmReset() {
    if (!resetting) return
    const row = resetting
    setResetting(null)
    await run(row, () => resetPhone(supabase, row.id, row.full_name), `Phone reset. ${first(row)} picks a phone again in the app.`)
  }

  const pageRows = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <Page wide>
      <PageHeader
        title="Work phones"
        subtitle="Each technician and helper uses the app on one registered phone, so nobody can time in for someone else. Only HR and the CEO see this list."
      />

      <StatRow>
        <StatTile loading={loading} icon={Users} label="Field staff" value={rows.length} hint="Technicians and helpers" />
        <StatTile loading={loading} icon={Smartphone} label="Registered" value={counts.withPhone} hint="Have a work phone" tone="success" />
        <StatTile loading={loading} icon={SmartphoneNfc} label="Wants a new phone" value={counts.waiting} hint={counts.waiting ? 'Waiting for you' : 'Nothing to approve'} tone={counts.waiting ? 'warning' : 'neutral'} />
        <StatTile loading={loading} icon={RotateCcw} label="No phone yet" value={counts.none} hint="Pick one in the app's first-time setup" />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Show"
          value={filter}
          onChange={(f) => { setFilter(f); setPage(1) }}
          items={[
            { value: 'all', label: 'Everyone', count: rows.length },
            { value: 'waiting', label: 'Wants a new phone', count: counts.waiting },
            { value: 'registered', label: 'Registered', count: counts.registered },
            { value: 'none', label: 'No phone yet', count: counts.none },
          ]}
        />
        <Input icon={Search} className="w-full sm:w-64" placeholder="Search name or phone" aria-label="Search name or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <TableContainer>
        <PhonesTable rows={pageRows} loading={loading} busyId={busyId} onDecide={decide} onReset={setResetting} />
        {shown.length > PER_PAGE && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(shown.length / PER_PAGE)}
            totalItems={shown.length}
            itemsPerPage={PER_PAGE}
            onPageChange={setPage}
            itemNamePlural="phones"
          />
        )}
      </TableContainer>

      <Modal
        isOpen={resetting !== null}
        onClose={() => setResetting(null)}
        icon={RotateCcw}
        iconTone="danger"
        title={`Reset ${resetting ? first(resetting) : ''}'s phone?`}
        subtitle={resetting?.phone?.device_name || undefined}
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetting(null)}>Keep it</Button>
            <Button variant="danger" onClick={confirmReset}>Reset phone</Button>
          </>
        }
      >
        <p className="text-small text-ink-2">
          This phone stops working for their account. The next phone they sign in on asks them to make it their work phone.
          Use this only if they lost the phone or it was factory reset.
        </p>
      </Modal>
    </Page>
  )
}
