// DtrBoard: the HR "DTR & attendance" page. Pick a cut-off, see everyone's totals, open a DTR, correct a punch, export.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePageCommand } from '@/components/commands/pageCommands'
import { AlertTriangle, CalendarCheck, Clock, Download, Search, Users } from 'lucide-react'
import { getDtrRecords, type DailyAuditRecord, type EmployeeAuditSummary } from '@/app/actions/audit'
import {
  Button,
  Input,
  Page,
  PageHeader,
  Pagination,
  Select,
  StatRow,
  StatTile,
  TableContainer,
  Tabs,
  useToast,
} from '@/components/ui'
import { recentCutoffs } from './cutoffs'
import { exportDtrCsv, exportDtrExcel } from './dtrExport'
import { DtrSummaryTable } from './DtrSummaryTable'
import { EmployeeDtrModal } from './EmployeeDtrModal'
import { CorrectionModal } from './CorrectionModal'
import { CorrectionHistoryModal, type HistoryTarget } from './CorrectionHistoryModal'

type RoleFilter = 'all' | 'technician' | 'helper'
const PER_PAGE = 10

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export function DtrBoard() {
  const toast = useToast()
  const cutoffs = useMemo(() => recentCutoffs(12), [])
  const [cutoffId, setCutoffId] = useState(cutoffs[0].id)
  const cutoff = cutoffs.find((c) => c.id === cutoffId) ?? cutoffs[0]
  const [role, setRole] = useState<RoleFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState<EmployeeAuditSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  // Quick actions: open a person's DTR for this cut-off by id.
  usePageCommand(['open'], (_command, id) => id && setOpenId(id))
  const [correcting, setCorrecting] = useState<DailyAuditRecord | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getDtrRecords(cutoff.startDate, cutoff.endDate, role)
      if (res.success) setRecords(res.records)
      else setError(res.error || 'The server could not work out the DTR.')
    } catch (err) {
      setError((err as Error).message || 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [cutoff.startDate, cutoff.endDate, role])

  useEffect(() => {
    load()
    setPage(1)
  }, [load])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? records.filter((r) => r.name.toLowerCase().includes(q) || r.level.toLowerCase().includes(q)) : records
  }, [records, search])

  const totals = useMemo(() => {
    const sum = (pick: (r: EmployeeAuditSummary) => number) => round1(records.reduce((n, r) => n + pick(r), 0))
    return {
      days: sum((r) => r.daysWorked),
      hours: sum((r) => r.totalHours),
      lates: sum((r) => r.lateCount),
      lateMinutes: sum((r) => r.totalLateMinutes),
      ot: sum((r) => r.regOtHours + r.sunHolidayOtHours),
      nightDiff: sum((r) => r.nightDiffHours),
      absences: sum((r) => r.absences),
      leaves: sum((r) => r.approvedLeaves),
    }
  }, [records])

  const openEmployee = records.find((r) => r.id === openId) ?? null

  async function correctionSaved() {
    await load() // recounting takes a few seconds; the pop-up stays open (Save spinning) until the DTR shows the change
    setCorrecting(null)
    toast.success('Correction saved')
  }

  return (
    <Page wide>
      <PageHeader
        title="DTR and attendance"
        subtitle="Days worked, lates, overtime, absences and leave per cut-off. Open someone's DTR to correct a punch."
        actions={
          <>
            <Button icon={Download} onClick={() => exportDtrCsv(cutoff, shown)} disabled={loading || shown.length === 0}>Export CSV</Button>
            <Button variant="primary" icon={Download} onClick={() => exportDtrExcel(cutoff, shown)} disabled={loading || shown.length === 0}>
              Export Excel
            </Button>
          </>
        }
      />

      <StatRow>
        <StatTile loading={loading} icon={Users} label="Field staff" value={records.length} hint={role === 'all' ? 'Technicians and helpers' : role === 'technician' ? 'Technicians' : 'Helpers'} />
        <StatTile loading={loading} icon={CalendarCheck} label="Days worked" value={totals.days} hint={`${totals.hours} hours in total`} />
        <StatTile loading={loading} icon={AlertTriangle} label="Lates" value={totals.lates} hint={totals.lates ? `${totals.lateMinutes} minutes in total` : 'No one was late'} tone={totals.lates ? 'warning' : 'success'} />
        <StatTile loading={loading} icon={Clock} label="Overtime" value={`${totals.ot} h`} hint={`Absent ${totals.absences} d · leave ${totals.leaves} d · night ${totals.nightDiff} h`} />
      </StatRow>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="Cut-off"
          className="w-48"
          value={cutoffId}
          onChange={(e) => setCutoffId(e.target.value)}
          options={cutoffs.map((c, i) => ({ value: c.id, label: i === 0 ? `${c.label} (current)` : c.label }))}
        />
        <Tabs
          label="Who to show"
          value={role}
          onChange={setRole}
          items={[
            { value: 'all', label: 'Everyone' },
            { value: 'technician', label: 'Technicians' },
            { value: 'helper', label: 'Helpers' },
          ]}
        />
        <Input icon={Search} className="ml-auto w-full sm:w-64" placeholder="Search name or level" aria-label="Search staff" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <TableContainer>
        <DtrSummaryTable records={shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)} loading={loading} error={error} onRetry={load} onOpen={(r) => setOpenId(r.id)} />
        {shown.length > PER_PAGE && (
          <Pagination currentPage={page} totalPages={Math.ceil(shown.length / PER_PAGE)} totalItems={shown.length} itemsPerPage={PER_PAGE} onPageChange={setPage} itemNamePlural="staff" />
        )}
      </TableContainer>

      <EmployeeDtrModal
        employee={correcting || history ? null : openEmployee}
        cutoff={cutoff}
        onClose={() => setOpenId(null)}
        onCorrect={setCorrecting}
        onHistory={(day) => openEmployee && setHistory({ employeeId: openEmployee.id, employeeName: openEmployee.name, date: day.date })}
      />
      <CorrectionModal employee={openEmployee} day={correcting} onClose={() => setCorrecting(null)} onSaved={correctionSaved} />
      <CorrectionHistoryModal target={history} onClose={() => setHistory(null)} />
    </Page>
  )
}
