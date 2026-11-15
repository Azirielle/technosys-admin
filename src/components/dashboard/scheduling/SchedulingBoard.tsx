// SchedulingBoard: the Coordinator's Scheduling page — jobs by day/week/month, crews, and temporary workers.
'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Plus, UserPlus, Users } from 'lucide-react'
import { Button, PageHeader, Skeleton, Tabs, useToast } from '@/components/ui'
import { formatLocalDate, type AssignmentType, type AssignmentTypeFilter, type CasualHelperItem, type HorizonGranularity, type ScheduleItem, type ViewMode } from './types'
import { useSchedules } from './useSchedules'
import SchedulingKpis from './SchedulingKpis'
import HorizonFilterBar from './HorizonFilterBar'
import ScheduleTableView from './ScheduleTableView'
import ScheduleTimelineView from './ScheduleTimelineView'
import ScheduleMonthCalendarView from './ScheduleMonthCalendarView'
import SteppedDispatchDrawer from './SteppedDispatchDrawer'
import DeploymentDrawer from './DeploymentDrawer'
import OfficeDutyDrawer from './OfficeDutyDrawer'
import QuickRescheduleDrawer from './QuickRescheduleDrawer'
import NewAssignmentModal from './NewAssignmentModal'
import { ReassignModal } from './ReassignModal'
import { CancelJobModal } from './CancelJobModal'
import { CasualHelperModal } from './CasualHelperModal'
import { CasualHelpersPanel } from './CasualHelpersPanel'

type Tab = 'jobs' | 'casual'
type QuickFilter = 'all' | 'unassigned' | 'conflicts'
type Drawer = 'none' | 'new' | 'on_site' | 'deployment' | 'office_duty' | 'job'
const PER_PAGE = 10

export function SchedulingBoard() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('jobs')
  const [date, setDate] = useState(() => new Date())
  const [granularity, setGranularity] = useState<HorizonGranularity>('day')
  const [typeFilter, setTypeFilter] = useState<AssignmentTypeFilter>('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showCancelled, setShowCancelled] = useState(false)
  const [page, setPage] = useState(1)
  const { schedules, profiles, casualHelpers, loading, loadingHelpers, conflicts, counts, loadSchedules, loadHelpers } = useSchedules(date, granularity)

  // Drawers and dialogs
  const [drawer, setDrawer] = useState<Drawer>('none')
  const [preselectedTech, setPreselectedTech] = useState<string | undefined>()
  const [jobForAssign, setJobForAssign] = useState<ScheduleItem | null>(null)
  const [openJob, setOpenJob] = useState<ScheduleItem | null>(null)
  const [jobTab, setJobTab] = useState<'reschedule' | 'edit_details' | 'history'>('reschedule')
  const [reassigning, setReassigning] = useState<ScheduleItem | null>(null)
  const [cancelling, setCancelling] = useState<ScheduleItem | null>(null)
  const [helperModal, setHelperModal] = useState<{ open: boolean; helper: CasualHelperItem | null }>({ open: false, helper: null })

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return schedules.filter((s) => {
      if (!showCancelled && s.status === 'cancelled') return false
      if (typeFilter === 'on_site' && s.assignment_type && s.assignment_type !== 'on_site') return false
      if (typeFilter !== 'all' && typeFilter !== 'on_site' && s.assignment_type !== typeFilter) return false
      if (quickFilter === 'unassigned' && s.technician_id && s.status !== 'unassigned') return false
      if (quickFilter === 'conflicts' && !conflicts.has(s.id)) return false
      if (!q) return true
      return [s.profiles?.full_name, s.client_name, s.project_name, s.location].some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [schedules, showCancelled, typeFilter, quickFilter, search, conflicts])

  function openJobDrawer(job: ScheduleItem, view: 'reschedule' | 'edit_details') {
    setOpenJob(job)
    setJobTab(view)
    setDrawer('job')
  }

  function startOnSite(techId?: string, job: ScheduleItem | null = null) {
    setPreselectedTech(techId)
    setJobForAssign(job)
    setDrawer('on_site')
  }

  function afterSave(targetDate?: string) {
    if (targetDate) setDate(new Date(targetDate))
    loadSchedules()
  }

  function changeGranularity(g: HorizonGranularity) {
    setGranularity(g)
    setPage(1)
    setViewMode(g === 'month' ? 'timeline' : 'table')
  }

  return (
    <div className="flex h-full flex-col gap-section overflow-y-auto px-page py-page-y [&>*]:shrink-0">
      <PageHeader
        title={tab === 'jobs' ? 'Scheduling' : 'Temporary workers'}
        subtitle={tab === 'jobs' ? 'Assign technicians and crews to jobs, and see who is working where.' : "Helpers hired per job who don't use the mobile app."}
        actions={
          tab === 'jobs' ? (
            <Button variant="primary" icon={Plus} onClick={() => setDrawer('new')}>New job</Button>
          ) : (
            <Button variant="primary" icon={UserPlus} onClick={() => setHelperModal({ open: true, helper: null })}>Add temporary worker</Button>
          )
        }
      />

      <Tabs
        label="Scheduling section"
        value={tab}
        onChange={(v) => {
          setTab(v)
          if (v === 'casual') loadHelpers()
        }}
        items={[
          { value: 'jobs', label: <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden />Jobs</span>, count: loading ? undefined : schedules.length },
          { value: 'casual', label: <span className="inline-flex items-center gap-1.5"><Users className="size-4" aria-hidden />Temporary workers</span>, count: loadingHelpers ? undefined : casualHelpers.length },
        ]}
      />

      {tab === 'jobs' ? (
        <>
          {/* Until the first jobs arrive, a grey bar instead of a row of zeros. */}
          {loading && schedules.length === 0 ? (
            <Skeleton className="mb-3 h-11 w-full rounded-card" />
          ) : (
          <SchedulingKpis
            onSiteCount={counts.onSite}
            deploymentsCount={counts.deployments}
            needsTeamCount={counts.needsTeam}
            conflictsCount={counts.conflicts}
            granularity={granularity}
            onFilterType={(type) => {
              setPage(1)
              if (type === 'on_site' || type === 'deployment') {
                setTypeFilter(type)
                setQuickFilter('all')
              } else {
                setTypeFilter('all')
                setQuickFilter((prev) => (prev === type ? 'all' : (type as QuickFilter)))
              }
            }}
          />
          )}
          <HorizonFilterBar
            currentDate={date}
            onDateChange={(d) => { setDate(d); setPage(1) }}
            granularity={granularity}
            onGranularityChange={changeGranularity}
            assignmentTypeFilter={typeFilter}
            onAssignmentTypeFilterChange={(t) => { setTypeFilter(t); setQuickFilter('all'); setPage(1) }}
            searchQuery={search}
            onSearchChange={(q) => { setSearch(q); setPage(1) }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showCancelled={showCancelled}
            onToggleShowCancelled={setShowCancelled}
            totalCount={shown.length}
          />
          {viewMode === 'table' ? (
            <ScheduleTableView
              schedules={shown}
              loading={loading}
              currentPage={page}
              itemsPerPage={PER_PAGE}
              onPageChange={setPage}
              onQuickReschedule={(s) => openJobDrawer(s, 'reschedule')}
              onReassign={setReassigning}
              onEdit={(s) => openJobDrawer(s, 'edit_details')}
              onCancel={setCancelling}
              onAssignNow={(s) => startOnSite(undefined, s)}
              granularity={granularity}
              upcomingCount={counts.onSite}
              onSwitchToUpcoming={() => { setGranularity('week'); setDate(new Date()) }}
            />
          ) : granularity === 'month' ? (
            <ScheduleMonthCalendarView
              currentDate={date}
              schedules={schedules}
              technicians={profiles}
              onSelectDate={setDate}
              onQuickReschedule={(s) => openJobDrawer(s, 'reschedule')}
              onEdit={(s) => openJobDrawer(s, 'edit_details')}
              onSwitchToTimeline={(d) => { setDate(d); setGranularity('day'); setViewMode('timeline') }}
              onDispatchTechnician={(techId, d) => { setDate(d); startOnSite(techId) }}
              onNewAssignmentForDate={(d) => { setDate(d); setDrawer('new') }}
            />
          ) : (
            <ScheduleTimelineView
              schedules={shown}
              technicians={profiles}
              selectedDate={formatLocalDate(date)}
              onQuickReschedule={(s) => openJobDrawer(s, 'reschedule')}
              onEdit={(s) => openJobDrawer(s, 'edit_details')}
              onDispatchSlot={(techId) => startOnSite(techId)}
            />
          )}
        </>
      ) : (
        <CasualHelpersPanel helpers={casualHelpers} loading={loadingHelpers} onEdit={(h) => setHelperModal({ open: true, helper: h })} onChanged={loadHelpers} />
      )}

      <NewAssignmentModal
        isOpen={drawer === 'new'}
        onClose={() => setDrawer((d) => (d === 'new' ? 'none' : d))}
        onSelectType={(type: AssignmentType) => (type === 'on_site' ? startOnSite() : setDrawer(type))}
      />
      <SteppedDispatchDrawer
        isOpen={drawer === 'on_site'}
        onClose={() => setDrawer('none')}
        profiles={profiles}
        casualHelpers={casualHelpers}
        existingSchedules={schedules}
        onOpenCasualRegisterModal={() => setHelperModal({ open: true, helper: null })}
        preselectedTechId={preselectedTech}
        initialSchedule={jobForAssign}
        selectedDate={date}
        onSuccess={afterSave}
      />
      <DeploymentDrawer isOpen={drawer === 'deployment'} onClose={() => setDrawer('none')} profiles={profiles} existingSchedules={schedules} selectedDate={date} onSuccess={() => loadSchedules()} />
      <OfficeDutyDrawer isOpen={drawer === 'office_duty'} onClose={() => setDrawer('none')} profiles={profiles} existingSchedules={schedules} selectedDate={date} onSuccess={() => loadSchedules()} />
      <QuickRescheduleDrawer
        isOpen={drawer === 'job'}
        onClose={() => setDrawer('none')}
        schedule={openJob}
        allSchedules={schedules}
        initialTab={jobTab}
        onReassign={(s) => { setDrawer('none'); setReassigning(s) }}
        onCancel={(s) => { setDrawer('none'); setCancelling(s) }}
        onSuccess={afterSave}
      />
      <ReassignModal job={reassigning} profiles={profiles} onClose={() => setReassigning(null)} onDone={() => { setReassigning(null); toast.success('Lead technician changed'); loadSchedules() }} />
      <CancelJobModal job={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); toast.success('Job cancelled'); loadSchedules() }} />
      <CasualHelperModal
        isOpen={helperModal.open}
        helper={helperModal.helper}
        onClose={() => setHelperModal({ open: false, helper: null })}
        onDone={() => { setHelperModal({ open: false, helper: null }); toast.success('Temporary worker saved'); loadHelpers() }}
      />
    </div>
  )
}
