'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  RotateCcw,
  Layers,
  Calendar,
  User,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  Info,
  ShieldAlert,
} from 'lucide-react'
import { getActivityLogs, ActivityLog } from '@/app/actions/activity'
import { getPersistentOverrides } from '@/app/actions/system-overrides'
import { OverrideMap, OverrideMetadataMap, isOverrideActive } from '@/lib/overrides'
import ModalDialog from '@/components/ui/ModalDialog'

// Known Department Heads & Staff Profiles
const RECIPIENT_DIRECTORY: Record<string, { name: string; title: string; dept: string; avatar: string }> = {
  hr: {
    name: 'Helena Vance',
    title: 'Lead HR Officer',
    dept: 'HR Department',
    avatar: 'HV',
  },
  coordinator: {
    name: 'Aileen Cruz',
    title: 'Operations Dispatcher',
    dept: 'Service Dept',
    avatar: 'AC',
  },
  accountant: {
    name: 'Alicia Rivera',
    title: 'Senior Financial Analyst',
    dept: 'Accounting',
    avatar: 'AR',
  },
  ceo: {
    name: 'Carlos Rivera',
    title: 'Chief Executive Officer',
    dept: 'Executive Office',
    avatar: 'CR',
  },
  super_admin: {
    name: 'TechnoSys Admin',
    title: 'System Administrator',
    dept: 'System Administration',
    avatar: 'TA',
  },
}

// Permission & Module friendly label mappings
const PERMISSION_FRIENDLY_NAMES: Record<string, { label: string; dept: string }> = {
  coordinator_tracking: { label: 'Fleet GPS Tracking', dept: 'Service Dept' },
  coordinator_dispatch: { label: 'Dispatch & Scheduling', dept: 'Service Dept' },
  coordinator_inventory: { label: 'Inventory & Assets', dept: 'Service Dept' },
  accountant_audit: { label: 'Audit & Transaction Records', dept: 'Accounting' },
  hr_tickets: { label: 'Tickets & Leave Requests', dept: 'HR Department' },
  hr_files: { label: 'Personnel 201 Records', dept: 'HR Department' },
  system_overrides: { label: 'System Access Overrides', dept: 'Executive Office' },
  schedule: { label: 'Field Dispatch & Scheduling', dept: 'Service Dept' },
  inventory: { label: 'Warehouse & Equipment', dept: 'Service Dept' },
  tickets: { label: 'Tickets & Leave Requests', dept: 'HR Department' },
  leaves: { label: 'Leave Requests', dept: 'HR Department' },
  employee: { label: 'Personnel 201 Records', dept: 'HR Department' },
  audit: { label: 'Financial Audit Records', dept: 'Accounting' },
  payroll: { label: 'Payroll Verification', dept: 'Accounting' },
}

// Normalized parsed activity for executive presentation
interface ParsedActivity {
  id: string
  rawLog: ActivityLog
  title: string
  narrative: string
  actorName: string
  recipientName: string
  recipientRole: string
  recipientAvatar: string
  department: string
  permissions: string[]
  reason?: string
  accessPeriod: string
  expiresAtFormatted?: string
  status: 'active' | 'completed' | 'revoked'
  category: 'temporary_access' | 'department_changes' | 'other'
  timestampFormatted: string
  fullDateFormatted: string
  isOverride: boolean
}

function formatExecutiveTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    return `${month} ${day}, ${year} · ${hours}:${minutes} ${ampm}`
  } catch {
    return isoString
  }
}

function formatFullDateTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const month = months[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`
  } catch {
    return isoString
  }
}

export default function AdminActivitiesClient() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [activeOverrides, setActiveOverrides] = useState<OverrideMap>({ accountant: [], coordinator: [], hr: [] })
  const [overridesMetadata, setOverridesMetadata] = useState<OverrideMetadataMap>({ accountant: {}, coordinator: {}, hr: {} })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'temporary_access' | 'department_changes'>('all')
  const [selectedActivity, setSelectedActivity] = useState<ParsedActivity | null>(null)
  const [isTechnicalDetailsOpen, setIsTechnicalDetailsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('')
  const ITEMS_PER_PAGE = 7

  // Load live activity logs and active persistent overrides from Supabase
  const loadData = useCallback(async (showRefreshingState = false) => {
    if (showRefreshingState) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [logsRes, overridesRes] = await Promise.all([
        getActivityLogs('all', 1, 150),
        getPersistentOverrides(),
      ])

      if (logsRes.logs) {
        setActivities(logsRes.logs)
      }
      if (overridesRes.success && overridesRes.overrides) {
        setActiveOverrides(overridesRes.overrides)
        setOverridesMetadata(overridesRes.metadata || { accountant: {}, coordinator: {}, hr: {} })
      }
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      console.error('Failed to load activity logs or persistent overrides:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'temporary_access' || tabParam === 'department_changes') {
        setActiveTab(tabParam)
      }
    }
  }, [loadData])

  // Parse raw logs into human-centric executive narratives
  const parsedActivities: ParsedActivity[] = useMemo(() => {
    return activities.map((log) => {
      const rawDesc = log.description || ''
      const actorName = log.performed_by_name || 'Carlos CEO'
      const timestampFormatted = formatExecutiveTimestamp(log.created_at)
      const fullDateFormatted = formatFullDateTime(log.created_at)

      // 1. Check for Reset All Overrides
      if (/reset all cross-departmental/i.test(rawDesc) || log.action === 'reset') {
        return {
          id: log.id,
          rawLog: log,
          title: 'All department permissions reset',
          narrative: `${actorName} reset all temporary access back to default security boundaries.`,
          actorName: actorName,
          recipientName: 'All Department Heads',
          recipientRole: 'System-wide',
          recipientAvatar: 'SYS',
          department: 'All Departments',
          permissions: ['Restored Default Boundaries'],
          accessPeriod: timestampFormatted,
          status: 'completed',
          category: 'department_changes',
          timestampFormatted,
          fullDateFormatted,
          isOverride: true,
        }
      }

      // 2. Check for Role Boundary Restoration / Revocation
      if (/restored standard role boundaries/i.test(rawDesc) || /Revoked all active overrides/i.test(rawDesc)) {
        let recipientRoleKey = 'accountant'
        let deptLabel = 'Accounting'
        let recipientName = 'Alicia Rivera'
        let recipientAvatar = 'AR'

        if (/HR Department/i.test(rawDesc) || /\[hr\]/i.test(rawDesc)) {
          recipientRoleKey = 'hr'
          deptLabel = 'HR Department'
          recipientName = 'Helena Vance'
          recipientAvatar = 'HV'
        } else if (/Field Operations/i.test(rawDesc) || /coordinator/i.test(rawDesc)) {
          recipientRoleKey = 'coordinator'
          deptLabel = 'Service Dept'
          recipientName = 'Aileen Cruz'
          recipientAvatar = 'AC'
        }

        return {
          id: log.id,
          rawLog: log,
          title: 'Department access restored',
          narrative: `${actorName} removed the temporary permissions for ${deptLabel}.`,
          actorName: actorName,
          recipientName: `${recipientName} · ${deptLabel}`,
          recipientRole: deptLabel,
          recipientAvatar,
          department: deptLabel,
          permissions: ['All temporary privileges revoked'],
          accessPeriod: timestampFormatted,
          status: 'completed',
          category: 'temporary_access',
          timestampFormatted,
          fullDateFormatted,
          isOverride: true,
        }
      }

      // 3. Check for Temporary Overrides Grant
      if (/granted temporary override access/i.test(rawDesc) || /CEO[- ]?[Uu]pdated cross-departmental/i.test(rawDesc) || (log as any).target_category === 'system_overrides' || log.category === 'system_overrides') {
        let recipientKey = 'hr'
        let recipientName = 'Helena Vance'
        let recipientRole = 'Lead HR Officer'
        let recipientDept = 'HR'
        let recipientAvatar = 'HV'

        if (/for Accountant/i.test(rawDesc) || /role \[accountant\]/i.test(rawDesc)) {
          recipientKey = 'accountant'
          recipientName = 'Alicia Rivera'
          recipientRole = 'Senior Financial Analyst'
          recipientDept = 'Accounting'
          recipientAvatar = 'AR'
        } else if (/for Field Operations/i.test(rawDesc) || /role \[coordinator\]/i.test(rawDesc)) {
          recipientKey = 'coordinator'
          recipientName = 'Aileen Cruz'
          recipientRole = 'Operations Dispatcher'
          recipientDept = 'Service Dept'
          recipientAvatar = 'AC'
        }

        // Extract permissions granted
        const permissions: string[] = []
        let targetDept = 'Service Dept'

        const modKeywords = [
          { key: 'Fleet Tracking', label: 'Fleet GPS Tracking', dept: 'Service Dept' },
          { key: 'Dispatch & Scheduling', label: 'Dispatch & Scheduling', dept: 'Service Dept' },
          { key: 'Inventory Management', label: 'Inventory & Assets', dept: 'Service Dept' },
          { key: 'Audit Logs', label: 'Audit & Transaction Records', dept: 'Accounting' },
          { key: 'Tickets & Leaves', label: 'Tickets & Leave Requests', dept: 'HR Department' },
          { key: '201 Files', label: 'Personnel 201 Records', dept: 'HR Department' },
        ]

        modKeywords.forEach((mk) => {
          if (rawDesc.includes(mk.key)) {
            permissions.push(mk.label)
            targetDept = mk.dept
          }
        })

        if (permissions.length === 0) {
          permissions.push('Cross-Departmental Access')
        }

        // If covering multiple departments
        const hasService = permissions.some((p) => p.includes('Fleet') || p.includes('Dispatch') || p.includes('Inventory'))
        const hasAccountant = permissions.some((p) => p.includes('Audit'))
        const hasHR = permissions.some((p) => p.includes('Tickets') || p.includes('201'))

        const deptPills: string[] = []
        if (hasService) deptPills.push('Service Dept')
        if (hasAccountant) deptPills.push('Accounting')
        if (hasHR) deptPills.push('HR')
        if (deptPills.length > 0) targetDept = deptPills.join(' & ')

        // Extract reason if recorded
        let reason: string | undefined = undefined
        const reasonMatch = rawDesc.match(/Reason:\s*([^·]+)/i)
        if (reasonMatch && reasonMatch[1]?.trim()) {
          reason = reasonMatch[1].trim()
        } else {
          const parenMatch = rawDesc.match(/\((Covering[^)]+)\)/i)
          if (parenMatch && parenMatch[1]) {
            reason = parenMatch[1].trim()
          }
        }

        // Check if this assignment is currently active in live persistent overrides
        const activeList = (activeOverrides as any)[recipientKey] || []
        const metaForRole = (overridesMetadata as any)[recipientKey] || {}
        const isCurrentlyActive = activeList.length > 0 && permissions.length > 0

        let expiresAtFormatted: string | undefined = undefined
        let accessPeriod = timestampFormatted

        if (isCurrentlyActive) {
          const firstMetaKey = Object.keys(metaForRole)[0]
          const metaItem = firstMetaKey ? metaForRole[firstMetaKey] : null
          if (metaItem?.expires_at) {
            expiresAtFormatted = formatExecutiveTimestamp(metaItem.expires_at)
            accessPeriod = `${timestampFormatted} – ${expiresAtFormatted}`
          } else if (metaItem?.duration) {
            accessPeriod = `${timestampFormatted} (${metaItem.duration.replace('_', ' ')})`
          }

          // If reason was stored in metadata's granted_by_name
          if (!reason && metaItem?.granted_by_name && metaItem.granted_by_name.includes('(')) {
            const m = metaItem.granted_by_name.match(/\((.*?)\)/)
            if (m && m[1] && m[1] !== 'Temporary Department Coverage') {
              reason = m[1].trim()
            }
          }
        }

        const narrative = `${actorName} gave ${recipientName} temporary access to ${targetDept}.`

        return {
          id: log.id,
          rawLog: log,
          title: 'Temporary access granted',
          narrative,
          actorName,
          recipientName: `${recipientName} · ${recipientRole}`,
          recipientRole,
          recipientAvatar,
          department: targetDept,
          permissions,
          reason,
          accessPeriod,
          expiresAtFormatted,
          status: isCurrentlyActive ? 'active' : 'completed',
          category: 'temporary_access',
          timestampFormatted,
          fullDateFormatted,
          isOverride: true,
        }
      }

      // 4. Other Standard Operational Logs (e.g. Schedule Dispatch, System Config)
      let title = 'Standard operational action'
      let narrative = rawDesc
      let dept = 'Field Operations'

      if (log.action.includes('schedule') || log.category === 'schedule') {
        title = 'Field dispatch scheduled'
        const leadMatch = rawDesc.match(/Dispatched Lead\s+([^"]+)\s+to\s+"([^"]+)"/i)
        if (leadMatch) {
          narrative = `Lead ${leadMatch[1].trim()} dispatched to ${leadMatch[2].trim()}.`
        }
        dept = 'Service Dept'
      } else if (log.action.includes('announcement') || log.category === 'announcement') {
        title = 'Executive announcement broadcasted'
        dept = 'Administration'
      }

      return {
        id: log.id,
        rawLog: log,
        title,
        narrative,
        actorName,
        recipientName: log.performed_by_name || 'Staff Member',
        recipientRole: log.performed_by_role || 'Staff',
        recipientAvatar: 'OP',
        department: dept,
        permissions: [title],
        accessPeriod: timestampFormatted,
        status: 'completed',
        category: 'other',
        timestampFormatted,
        fullDateFormatted,
        isOverride: false,
      }
    })
  }, [activities, activeOverrides, overridesMetadata])

  // Compute executive summary card statistics
  const metrics = useMemo(() => {
    // Currently active temporary assignments count
    let activeAssignmentsCount = 0
    Object.values(activeOverrides).forEach((mods) => {
      if (Array.isArray(mods) && mods.length > 0) activeAssignmentsCount += 1
    })

    // Completed assignments count
    const completedAssignmentsCount = parsedActivities.filter(
      (a) => a.category === 'temporary_access' && a.status === 'completed'
    ).length

    // Total access events
    const totalEventsCount = parsedActivities.length

    return {
      activeAssignmentsCount,
      completedAssignmentsCount,
      totalEventsCount,
    }
  }, [activeOverrides, parsedActivities])

  // Filter activities based on tab and search query
  const filteredActivities = useMemo(() => {
    return parsedActivities.filter((item) => {
      // 1. Tab category filter
      if (activeTab === 'temporary_access' && item.category !== 'temporary_access') {
        return false
      }
      if (activeTab === 'department_changes' && item.category !== 'department_changes') {
        return false
      }

      // 2. Search query filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchNarrative = item.narrative.toLowerCase().includes(q)
        const matchActor = item.actorName.toLowerCase().includes(q)
        const matchRecipient = item.recipientName.toLowerCase().includes(q)
        const matchDept = item.department.toLowerCase().includes(q)
        const matchReason = item.reason ? item.reason.toLowerCase().includes(q) : false
        const matchPerms = item.permissions.some((p) => p.toLowerCase().includes(q))

        if (!matchTitle && !matchNarrative && !matchActor && !matchRecipient && !matchDept && !matchReason && !matchPerms) {
          return false
        }
      }

      return true
    })
  }, [parsedActivities, activeTab, search])

  // Pagination calculation
  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE) || 1
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredActivities.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredActivities, currentPage, ITEMS_PER_PAGE])

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden p-6 md:p-8 space-y-6 bg-[#F5F4F7] dark:bg-[#22232A] select-none transition-colors duration-250">
      
      {/* 1. Executive Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
              Access History
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EBEAEF] dark:bg-[#343640] text-[#575762] dark:text-[#B0B2BD] border border-black/[0.04] dark:border-white/[0.06]">
              Audit Trail
            </span>
          </div>
          <p className="text-xs md:text-sm font-medium text-[#7A7C88] dark:text-[#9A9BA6]">
            See who received access, what changed, and when it happened.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {lastRefreshedAt && (
            <span className="text-[11px] font-medium text-[#8E8D9A] dark:text-[#7A7C88] hidden sm:inline-block">
              Updated {lastRefreshedAt}
            </span>
          )}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF9FB] dark:bg-[#2B2C35] hover:bg-[#EBEAEF] dark:hover:bg-[#343640] text-[#121215] dark:text-[#F4F4F6] border border-black/[0.06] dark:border-white/[0.08] shadow-xs cursor-pointer transition-all disabled:opacity-50"
            title="Refresh access history ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#575762] dark:text-[#B0B2BD] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 shrink-0">
        
        {/* Card 1: Currently active */}
        <div className="p-4 rounded-2xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-[#7A7C88] dark:text-[#9A9BA6]">
                Currently active
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
              {metrics.activeAssignmentsCount}
            </div>
            <div className="text-[11px] font-medium text-[#8E8D9A] dark:text-[#7A7C88]">
              Temporary assignments
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Access ended */}
        <div className="p-4 rounded-2xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8E8D9A]" />
              <span className="text-xs font-semibold text-[#7A7C88] dark:text-[#9A9BA6]">
                Access ended
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
              {metrics.completedAssignmentsCount}
            </div>
            <div className="text-[11px] font-medium text-[#8E8D9A] dark:text-[#7A7C88]">
              Completed assignments
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EBEAEF] dark:bg-[#343640] text-[#575762] dark:text-[#B0B2BD] flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Recorded Events */}
        <div className="p-4 rounded-2xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1 transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4D55CC]" />
              <span className="text-xs font-semibold text-[#7A7C88] dark:text-[#9A9BA6]">
                Total recorded
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
              {metrics.totalEventsCount}
            </div>
            <div className="text-[11px] font-medium text-[#8E8D9A] dark:text-[#7A7C88]">
              Audit ledger events
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#4D55CC]/10 text-[#4D55CC] dark:text-[#818CF8] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search and Category Filter Tabs */}
      <div className="p-3 md:p-3.5 rounded-2xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#8E8D9A] dark:text-[#7A7C88] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employee, department, or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#EBEAEF] dark:bg-[#343640] border border-black/[0.04] dark:border-white/[0.06] text-xs text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] dark:placeholder-[#7A7C88] focus:outline-none focus:ring-2 focus:ring-[#4D55CC] transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#EBEAEF] dark:bg-[#343640] rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('all')
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#4D55CC] text-[#FAF9FB] shadow-xs'
                : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
            }`}
          >
            All activity
            <span className="ml-1.5 opacity-75 font-mono text-[11px]">
              ({parsedActivities.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('temporary_access')
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'temporary_access'
                ? 'bg-[#4D55CC] text-[#FAF9FB] shadow-xs'
                : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
            }`}
          >
            Temporary access
            <span className="ml-1.5 opacity-75 font-mono text-[11px]">
              ({parsedActivities.filter((a) => a.category === 'temporary_access').length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('department_changes')
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'department_changes'
                ? 'bg-[#4D55CC] text-[#FAF9FB] shadow-xs'
                : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
            }`}
          >
            Department changes
            <span className="ml-1.5 opacity-75 font-mono text-[11px]">
              ({parsedActivities.filter((a) => a.category === 'department_changes').length})
            </span>
          </button>
        </div>
      </div>

      {/* 4. Activity List Stream */}
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        <div className="space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            // Skeleton loading rows
            Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="p-4 rounded-2xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between animate-pulse"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-44 bg-[#EBEAEF] dark:bg-[#343640] rounded" />
                  <div className="h-3 w-80 bg-[#EBEAEF] dark:bg-[#343640] rounded" />
                  <div className="h-2.5 w-32 bg-[#EBEAEF] dark:bg-[#343640] rounded" />
                </div>
                <div className="h-6 w-20 bg-[#EBEAEF] dark:bg-[#343640] rounded-full" />
              </div>
            ))
          ) : paginatedActivities.length === 0 ? (
            // Empty State
            <div className="p-12 text-center rounded-2xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.05] dark:border-white/[0.08] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-[#EBEAEF] dark:bg-[#343640] text-[#8E8D9A] dark:text-[#7A7C88] flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#121215] dark:text-[#F4F4F6] mb-1">
                No activities found
              </h3>
              <p className="text-xs text-[#7A7C88] dark:text-[#9A9BA6] max-w-sm">
                No activity logs match your current search criteria or tab filter.
              </p>
            </div>
          ) : (
            // Activity Entries
            paginatedActivities.map((act) => {
              const isActive = act.status === 'active'

              return (
                <div
                  key={act.id}
                  onClick={() => setSelectedActivity(act)}
                  className="group p-4 md:p-5 rounded-2xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.04] dark:border-white/[0.06] hover:border-[#4D55CC]/50 dark:hover:border-[#4D55CC]/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Block: Icon + Content */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : act.title.includes('restored')
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : act.title.includes('reset')
                          ? 'bg-[#EBEAEF] dark:bg-[#343640] text-[#575762] dark:text-[#B0B2BD]'
                          : 'bg-[#4D55CC]/10 text-[#4D55CC] dark:text-[#818CF8]'
                      }`}
                    >
                      {isActive ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : act.title.includes('restored') ? (
                        <RotateCcw className="w-5 h-5" />
                      ) : act.title.includes('reset') ? (
                        <Layers className="w-5 h-5" />
                      ) : (
                        <KeyRound className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#121215] dark:text-[#F4F4F6] group-hover:text-[#4D55CC] dark:group-hover:text-[#818CF8] transition-colors">
                          {act.title}
                        </span>
                        {act.department && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EBEAEF] dark:bg-[#343640] text-[#575762] dark:text-[#B0B2BD]">
                            {act.department}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-1 leading-relaxed">
                        {act.narrative}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#8E8D9A] dark:text-[#7A7C88]">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-[#8E8D9A]" />
                          {act.timestampFormatted}
                        </span>

                        {act.reason && (
                          <span className="truncate max-w-[280px] italic text-[#7A7C88] dark:text-[#9A9BA6]">
                            &ldquo;{act.reason}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Block: Status Pill & View Action */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-black/[0.04] dark:border-white/[0.06]">
                    {isActive ? (
                      <div className="flex flex-col items-start md:items-end">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                        {act.expiresAtFormatted && (
                          <span className="text-[10px] font-medium text-[#7A7C88] dark:text-[#9A9BA6] mt-0.5">
                            Expires {act.expiresAtFormatted.split('·')[1]?.trim() || act.expiresAtFormatted}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EBEAEF] dark:bg-[#343640] text-[#575762] dark:text-[#B0B2BD] border border-black/[0.04] dark:border-white/[0.06]">
                        Completed
                      </span>
                    )}

                    <div className="w-7 h-7 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] group-hover:bg-[#4D55CC] text-[#7A7C88] group-hover:text-white flex items-center justify-center transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 5. Porcelain Pagination Footer */}
        {filteredActivities.length > 0 && (
          <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
            <p className="text-xs text-[#7A7C88] dark:text-[#9A9BA6]">
              Showing{' '}
              <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredActivities.length)}
              </span>{' '}
              of{' '}
              <span className="font-bold text-[#121215] dark:text-[#F4F4F6]">
                {filteredActivities.length}
              </span>{' '}
              activities
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#575762] dark:text-[#B0B2BD] hover:bg-[#EBEAEF] dark:hover:bg-[#343640] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-xs font-semibold text-[#121215] dark:text-[#F4F4F6]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#575762] dark:text-[#B0B2BD] hover:bg-[#EBEAEF] dark:hover:bg-[#343640] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Activity Details Modal (Clean Document Hierarchy - Matching Reference Image 1) */}
      <ModalDialog
        isOpen={!!selectedActivity}
        onClose={() => {
          setSelectedActivity(null)
          setIsTechnicalDetailsOpen(false)
        }}
        title="Activity Details"
        subtitle="Full executive context and verification record."
        maxWidth="lg"
      >
        {selectedActivity && (
          <div className="space-y-4 pt-1 text-xs text-[#121215] dark:text-[#F4F4F6]">
            
            {/* Header Block: Event Title + Explanation + Status Pill */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedActivity.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : selectedActivity.title.includes('restored')
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : selectedActivity.title.includes('reset')
                      ? 'bg-[#EBEAEF] dark:bg-[#343640] text-[#575762] dark:text-[#B0B2BD]'
                      : 'bg-[#4D55CC]/10 text-[#4D55CC] dark:text-[#818CF8]'
                  }`}
                >
                  {selectedActivity.status === 'active' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : selectedActivity.title.includes('restored') ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : selectedActivity.title.includes('reset') ? (
                    <Layers className="w-5 h-5" />
                  ) : (
                    <KeyRound className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#121215] dark:text-[#F4F4F6] tracking-tight">
                    {selectedActivity.title}
                  </h3>
                  <p className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-0.5 leading-relaxed">
                    {selectedActivity.narrative}
                  </p>
                </div>
              </div>

              {selectedActivity.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EBEAEF] dark:bg-[#343640] text-[#575762] dark:text-[#B0B2BD] border border-black/[0.04] dark:border-white/[0.06] shrink-0">
                  Completed
                </span>
              )}
            </div>

            <div className="w-full h-[1px] bg-black/[0.06] dark:bg-white/[0.08]" />

            {/* Section 1: People involved */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                People involved
              </div>

              <div className="space-y-2.5">
                {/* Granted by */}
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-[#4D55CC] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-medium text-[#7A7C88] dark:text-[#9A9BA6]">
                      Granted by
                    </div>
                    <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6] mt-0.5">
                      {selectedActivity.actorName} · CEO
                    </div>
                  </div>
                </div>

                {/* Access given to */}
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-[#4D55CC] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-medium text-[#7A7C88] dark:text-[#9A9BA6]">
                      Access given to
                    </div>
                    <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6] mt-0.5">
                      {selectedActivity.recipientName}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full h-[1px] bg-black/[0.06] dark:bg-white/[0.08]" />

            {/* Section 2: What can [Name] do? / What changed? */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                {selectedActivity.title.includes('reset') || selectedActivity.title.includes('restored')
                  ? 'What changed?'
                  : `What can ${selectedActivity.recipientName.split(' ')[0]} do?`}
              </div>

              {selectedActivity.permissions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedActivity.permissions.map((perm, idx) => (
                    <span
                      key={`perm-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#EBEAEF] dark:bg-[#343640] text-[#121215] dark:text-[#F4F4F6] border border-black/[0.04] dark:border-white/[0.06]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{perm}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#575762] dark:text-[#B0B2BD]">
                  Standard role boundaries restored.
                </p>
              )}
            </div>

            <div className="w-full h-[1px] bg-black/[0.06] dark:bg-white/[0.08]" />

            {/* Section 3: When does access end? */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                {selectedActivity.status === 'active' ? 'When does access end?' : 'When did access end?'}
              </div>
              <p className="text-xs font-medium text-[#121215] dark:text-[#F4F4F6]">
                {selectedActivity.expiresAtFormatted
                  ? selectedActivity.expiresAtFormatted
                  : selectedActivity.accessPeriod}
              </p>
            </div>

            <div className="w-full h-[1px] bg-black/[0.06] dark:bg-white/[0.08]" />

            {/* Section 4: Reason */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                Reason
              </div>
              {selectedActivity.reason ? (
                <p className="text-xs text-[#121215] dark:text-[#F4F4F6] italic leading-relaxed">
                  &ldquo;{selectedActivity.reason}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-[#8E8D9A] dark:text-[#7A7C88] italic">
                  No specific reason recorded for this activity.
                </p>
              )}
            </div>

            {/* Section 5: Technical Details Accordion */}
            <div className="pt-1">
              <div className="rounded-xl bg-[#EBEAEF] dark:bg-[#1E1F25] border border-black/[0.05] dark:border-white/[0.07] overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setIsTechnicalDetailsOpen((prev) => !prev)}
                  className="w-full p-3 flex items-start gap-2.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <ChevronRight
                    className={`w-4 h-4 text-[#8E8D9A] dark:text-[#7A7C88] shrink-0 mt-0.5 transition-transform duration-200 ${
                      isTechnicalDetailsOpen ? 'rotate-90' : ''
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                      Technical details
                    </div>
                    <div className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] mt-0.5">
                      Expand only when troubleshooting or investigating an issue.
                    </div>
                  </div>
                </button>

                {isTechnicalDetailsOpen && (
                  <div className="p-3 pt-2 border-t border-black/[0.05] dark:border-white/[0.07] space-y-1.5 text-[11px] font-mono text-[#575762] dark:text-[#B0B2BD]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8E8D9A] dark:text-[#7A7C88]">Log UUID:</span>
                      <span className="font-bold text-[#121215] dark:text-[#F4F4F6] select-all">
                        {selectedActivity.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8E8D9A] dark:text-[#7A7C88]">Recorded (UTC):</span>
                      <span>{selectedActivity.fullDateFormatted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8E8D9A] dark:text-[#7A7C88]">Action Type:</span>
                      <span className="uppercase">{selectedActivity.rawLog.action}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8E8D9A] dark:text-[#7A7C88]">Target Category:</span>
                      <span>{selectedActivity.rawLog.category}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Dismiss Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedActivity(null)
                  setIsTechnicalDetailsOpen(false)
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FAF9FB] dark:bg-[#2B2C35] hover:bg-[#EBEAEF] dark:hover:bg-[#343640] text-[#121215] dark:text-[#F4F4F6] border border-black/[0.06] dark:border-white/[0.08] shadow-xs cursor-pointer transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  )
}
