'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  X,
  Users,
  Calendar,
  MapPin,
  Box,
  FileSpreadsheet,
  Ticket,
  FolderOpen,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  Building2,
  Layers,
  ChevronRight,
  Shield,
  FileText,
} from 'lucide-react'
import {
  SYSTEM_MODULES,
  SystemModule,
  subscribeToOverrideChanges,
  saveSystemOverrides,
  OverrideMap,
  OverrideMetadataMap,
  OverrideMetadataItem,
  OverrideDuration,
  RoleKey,
  isOverrideActive,
  formatRemainingTime,
} from '@/lib/overrides'
import {
  getPersistentOverrides,
  updatePersistentOverride,
  resetAllPersistentOverrides,
  getStaffAbsencesToday,
  StaffAbsence,
} from '@/app/actions/system-overrides'
import { getCleanErrorMessage } from '@/lib/error-sanitizer'

// Executive Staff Recipient Profiles
interface RecipientOption {
  roleKey: RoleKey
  name: string
  title: string
  deptKey: string
  avatarText: string
  avatarColor: string
}

const RECIPIENT_OPTIONS: RecipientOption[] = [
  {
    roleKey: 'hr',
    name: 'Helena Vance',
    title: 'Lead HR Officer',
    deptKey: 'HR',
    avatarText: 'HR',
    avatarColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    roleKey: 'coordinator',
    name: 'Aileen Cruz',
    title: 'Operations Dispatcher',
    deptKey: 'Service Dept',
    avatarText: 'SD',
    avatarColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    roleKey: 'accountant',
    name: 'Alicia Rivera',
    title: 'Senior Financial Analyst',
    deptKey: 'Accountant',
    avatarText: 'AC',
    avatarColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
]

// Executive Department Definition
interface DepartmentConfig {
  id: 'service' | 'accountant' | 'hr'
  label: string
  fullLabel: string
  roleKey: RoleKey
  headName: string
  headRole: string
  avatarText: string
  avatarColor: string
  moduleIds: string[]
}

const EXECUTIVE_DEPARTMENTS: DepartmentConfig[] = [
  {
    id: 'service',
    label: 'Service Dept',
    fullLabel: 'Service & Field Operations',
    roleKey: 'coordinator',
    headName: 'Aileen Cruz',
    headRole: 'Coordinator & Logistics',
    avatarText: 'SD',
    avatarColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    moduleIds: ['coordinator_tracking', 'coordinator_dispatch', 'coordinator_inventory'],
  },
  {
    id: 'accountant',
    label: 'Accountant',
    fullLabel: 'Finance & Payroll',
    roleKey: 'accountant',
    headName: 'Alicia Rivera',
    headRole: 'Finance & Payroll Lead',
    avatarText: 'AC',
    avatarColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    moduleIds: ['accountant_audit'],
  },
  {
    id: 'hr',
    label: 'HR',
    fullLabel: 'Human Resources & Compliance',
    roleKey: 'hr',
    headName: 'Helena Vance',
    headRole: 'HR Manager',
    avatarText: 'HR',
    avatarColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    moduleIds: ['hr_tickets', 'hr_files'],
  },
]

// Operational Capability Metadata
interface TabConfig {
  id: string
  name: string
  deptId: 'service' | 'accountant' | 'hr'
  deptLabel: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  coordinator_tracking: {
    id: 'coordinator_tracking',
    name: 'Fleet GPS Tracking',
    deptId: 'service',
    deptLabel: 'Service Dept',
    description: 'Live technician map, movement spotlighting, and active shift tracking.',
    icon: MapPin,
  },
  coordinator_dispatch: {
    id: 'coordinator_dispatch',
    name: 'Dispatch & Scheduling',
    deptId: 'service',
    deptLabel: 'Service Dept',
    description: 'Create dispatches, geocode job addresses, and assign technician shifts.',
    icon: Calendar,
  },
  coordinator_inventory: {
    id: 'coordinator_inventory',
    name: 'Tool & Parts Inventory',
    deptId: 'service',
    deptLabel: 'Service Dept',
    description: 'Warehouse parts catalog, tool check-out ledger, and equipment logs.',
    icon: Box,
  },
  accountant_audit: {
    id: 'accountant_audit',
    name: 'Payroll & Audit Logs',
    deptId: 'accountant',
    deptLabel: 'Accountant',
    description: 'Salary calculations, overtime audits, payroll locks, and Excel exports.',
    icon: FileSpreadsheet,
  },
  hr_tickets: {
    id: 'hr_tickets',
    name: 'Tickets & Leave Approvals',
    deptId: 'hr',
    deptLabel: 'HR',
    description: 'Employee disputes, ticket resolutions, and vacation/sick leave approvals.',
    icon: Ticket,
  },
  hr_files: {
    id: 'hr_files',
    name: '201 Personnel Records',
    deptId: 'hr',
    deptLabel: 'HR',
    description: 'Digital employee profiles, government compliance, and disciplinary records.',
    icon: FolderOpen,
  },
}

interface ActiveCoverageItem {
  coveringRoleKey: RoleKey
  coveringStaffName: string
  coveringRoleLabel: string
  targetDeptLabel: string
  moduleId: string
  moduleName: string
  expiresAt: string | null
  duration: OverrideDuration
  reason: string
  remainingText: string
}

export default function SystemOverridesClient() {
  const [overrides, setOverrides] = useState<OverrideMap>({ accountant: [], coordinator: [], hr: [] })
  const [metadata, setMetadata] = useState<OverrideMetadataMap>({ accountant: {}, coordinator: {}, hr: {} })
  const [loading, setLoading] = useState<boolean>(true)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [errorNotification, setErrorNotification] = useState<string | null>(null)

  // Staff Absences from DB
  const [absencesToday, setAbsencesToday] = useState<StaffAbsence[]>([])

  // Delegation Modal State
  const [isDelegationOpen, setIsDelegationOpen] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<RoleKey>('hr')
  const [activeDeptTab, setActiveDeptTab] = useState<'service' | 'accountant' | 'hr'>('service')
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set())
  const [selectedDuration, setSelectedDuration] = useState<OverrideDuration>('1_day')
  const [auditReason, setAuditReason] = useState('')

  // Revocation Modal State
  const [revokeTarget, setRevokeTarget] = useState<{
    roleKey: RoleKey
    moduleId: string
    moduleName: string
    staffName: string
    deptLabel: string
  } | null>(null)

  // Safety Confirmation for Reset All
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  // Notification helpers
  const showToast = useCallback((msg: string) => {
    setErrorNotification(null)
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }, [])

  const showErrorToast = useCallback((msg: string) => {
    setNotification(null)
    setErrorNotification(getCleanErrorMessage(msg))
    setTimeout(() => setErrorNotification(null), 5000)
  }, [])

  // Load persistent overrides and absences on mount
  useEffect(() => {
    let mounted = true

    async function loadInitialData() {
      try {
        const [overridesRes, absencesRes] = await Promise.all([
          getPersistentOverrides(),
          getStaffAbsencesToday(),
        ])

        if (mounted) {
          if (overridesRes.success) {
            setOverrides(overridesRes.overrides)
            setMetadata(overridesRes.metadata)
            saveSystemOverrides(overridesRes.overrides, overridesRes.metadata)
          }
          if (absencesRes.success) {
            setAbsencesToday(absencesRes.absences)
          }
        }
      } catch (err) {
        console.error('Failed to load CEO hub data:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadInitialData()

    // Handle Quick Action trigger (Custom Event or URL param)
    const handleQuickAction = () => handleOpenDelegation()
    window.addEventListener('open-give-access-modal', handleQuickAction)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('action') === 'give_access') {
        setTimeout(() => handleOpenDelegation(), 200)
      }
    }

    // Real-time synchronization
    const unsubscribe = subscribeToOverrideChanges((freshOverrides, freshMeta) => {
      if (mounted) {
        setOverrides(freshOverrides)
        if (freshMeta) setMetadata(freshMeta)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Active Delegations list computed from metadata
  const activeCoverageList = useMemo(() => {
    const list: ActiveCoverageItem[] = []
    const roleKeys: RoleKey[] = ['accountant', 'coordinator', 'hr']

    roleKeys.forEach((roleKey) => {
      const roleMeta = metadata[roleKey] || {}
      const recipient = RECIPIENT_OPTIONS.find((r) => r.roleKey === roleKey)

      Object.entries(roleMeta).forEach(([modId, item]) => {
        if (isOverrideActive(item)) {
          const tabConfig = TAB_CONFIGS[modId]
          const targetDeptLabel = tabConfig ? tabConfig.deptLabel : 'Department System'
          const moduleName = tabConfig ? tabConfig.name : modId

          list.push({
            coveringRoleKey: roleKey,
            coveringStaffName: recipient ? `${recipient.name} (${recipient.avatarText})` : roleKey,
            coveringRoleLabel: recipient?.title || roleKey,
            targetDeptLabel,
            moduleId: modId,
            moduleName,
            expiresAt: item.expires_at,
            duration: item.duration,
            reason: item.granted_by_name || 'CEO Temporary Access',
            remainingText: formatRemainingTime(item.expires_at),
          })
        }
      })
    })

    return list
  }, [metadata])

  // Count active permissions and unique covering staff
  const activePermissionCount = activeCoverageList.length
  const uniqueCoveringStaffCount = useMemo(() => {
    const staffSet = new Set(activeCoverageList.map((i) => i.coveringRoleKey))
    return staffSet.size
  }, [activeCoverageList])

  // Quick summary for signal cards
  const delegationSummaryText = useMemo(() => {
    if (activeCoverageList.length === 0) return 'All 3 departments operating in standard scope'
    if (uniqueCoveringStaffCount === 1) {
      const first = activeCoverageList[0]
      return `${first.coveringStaffName.split(' ')[0]} covering ${activeCoverageList.length} permissions`
    }
    return `${uniqueCoveringStaffCount} employees covering ${activeCoverageList.length} permissions`
  }, [activeCoverageList, uniqueCoveringStaffCount])

  // Open delegation modal, optionally pre-selecting a department
  const handleOpenDelegation = (deptId?: 'service' | 'accountant' | 'hr') => {
    if (deptId) {
      setActiveDeptTab(deptId)
      const deptModules = EXECUTIVE_DEPARTMENTS.find((d) => d.id === deptId)?.moduleIds || []
      if (deptModules.length > 0) {
        setSelectedModuleIds(new Set([deptModules[0]]))
      } else {
        setSelectedModuleIds(new Set())
      }
    } else {
      setSelectedModuleIds(new Set(['coordinator_tracking']))
    }
    setAuditReason('')
    setSelectedDuration('1_day')
    setIsDelegationOpen(true)
  }

  // Toggle single module selection (cumulative across departments)
  const handleToggleModule = (modId: string) => {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(modId)) {
        next.delete(modId)
      } else {
        next.add(modId)
      }
      return next
    })
  }

  // Toggle select all in currently active department tab
  const handleToggleSelectAllInTab = () => {
    const currentDept = EXECUTIVE_DEPARTMENTS.find((d) => d.id === activeDeptTab)
    if (!currentDept) return

    const tabModuleIds = currentDept.moduleIds
    const allSelected = tabModuleIds.every((id) => selectedModuleIds.has(id))

    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        tabModuleIds.forEach((id) => next.delete(id))
      } else {
        tabModuleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  // Calculate count of selected modules in a given department
  const getSelectedCountInDept = (deptId: 'service' | 'accountant' | 'hr') => {
    const dept = EXECUTIVE_DEPARTMENTS.find((d) => d.id === deptId)
    if (!dept) return 0
    return dept.moduleIds.filter((id) => selectedModuleIds.has(id)).length
  }

  // Selected module names for the confirmation review box
  const selectedModuleNames = useMemo(() => {
    return Array.from(selectedModuleIds).map((id) => TAB_CONFIGS[id]?.name || id)
  }, [selectedModuleIds])

  // Submit Delegation Form
  const handleSubmitDelegation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedModuleIds.size === 0) {
      showErrorToast('Please select at least one permission to grant.')
      return
    }

    const recipient = RECIPIENT_OPTIONS.find((r) => r.roleKey === selectedRecipient)
    const recipientName = recipient ? recipient.name : selectedRecipient

    let expiresAt: string | null = null
    const now = Date.now()

    if (selectedDuration === '1_day') {
      expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString()
    } else if (selectedDuration === '2_days') {
      expiresAt = new Date(now + 48 * 60 * 60 * 1000).toISOString()
    } else if (selectedDuration === '7_days') {
      expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
    } else {
      expiresAt = null
    }

    const currentList = overrides[selectedRecipient] || []
    const updatedSet = new Set(currentList)
    selectedModuleIds.forEach((id) => updatedSet.add(id))
    const updatedList = Array.from(updatedSet)

    const updatedRoleMeta = { ...(metadata[selectedRecipient] || {}) }
    const reasonText = auditReason.trim()
      ? `CEO (${auditReason.trim()})`
      : 'Temporary Department Coverage'

    selectedModuleIds.forEach((modId) => {
      updatedRoleMeta[modId] = {
        duration: selectedDuration,
        expires_at: expiresAt,
        granted_at: new Date().toISOString(),
        granted_by_name: reasonText,
      }
    })

    const previousOverrides = overrides
    const previousMeta = metadata

    const newOverrides: OverrideMap = { ...overrides, [selectedRecipient]: updatedList }
    const newMetadata: OverrideMetadataMap = { ...metadata, [selectedRecipient]: updatedRoleMeta }

    // Optimistic UI update
    setOverrides(newOverrides)
    setMetadata(newMetadata)
    saveSystemOverrides(newOverrides, newMetadata)
    setIsDelegationOpen(false)
    setIsSyncing(true)

    try {
      const res = await updatePersistentOverride(selectedRecipient, updatedList, updatedRoleMeta)
      if (!res.success) {
        setOverrides(previousOverrides)
        setMetadata(previousMeta)
        saveSystemOverrides(previousOverrides, previousMeta)
        showErrorToast(res.error || `Failed to activate temporary access for ${recipientName}`)
      } else {
        const count = selectedModuleIds.size
        showToast(
          `Granted temporary access: ${count} permission${count > 1 ? 's' : ''} assigned to ${recipientName}.`
        )
      }
    } catch (err: any) {
      setOverrides(previousOverrides)
      setMetadata(previousMeta)
      saveSystemOverrides(previousOverrides, previousMeta)
      showErrorToast(err.message || `Network error granting temporary access to ${recipientName}`)
    } finally {
      setIsSyncing(false)
    }
  }

  // Execute single tab revocation
  const handleExecuteRevoke = async () => {
    if (!revokeTarget) return
    const { roleKey, moduleId, moduleName, staffName } = revokeTarget

    const currentList = overrides[roleKey] || []
    const updatedList = currentList.filter((id) => id !== moduleId)

    const updatedRoleMeta = { ...(metadata[roleKey] || {}) }
    delete updatedRoleMeta[moduleId]

    const previousOverrides = overrides
    const previousMeta = metadata

    const newOverrides: OverrideMap = { ...overrides, [roleKey]: updatedList }
    const newMetadata: OverrideMetadataMap = { ...metadata, [roleKey]: updatedRoleMeta }

    // Optimistic UI update
    setOverrides(newOverrides)
    setMetadata(newMetadata)
    saveSystemOverrides(newOverrides, newMetadata)
    setRevokeTarget(null)
    setIsSyncing(true)

    try {
      const res = await updatePersistentOverride(roleKey, updatedList, updatedRoleMeta)
      if (!res.success) {
        setOverrides(previousOverrides)
        setMetadata(previousMeta)
        saveSystemOverrides(previousOverrides, previousMeta)
        showErrorToast(res.error || `Failed to remove access for ${staffName}`)
      } else {
        showToast(`Removed temporary access to "${moduleName}". Access returned to standard boundaries.`)
      }
    } catch (err: any) {
      setOverrides(previousOverrides)
      setMetadata(previousMeta)
      saveSystemOverrides(previousOverrides, previousMeta)
      showErrorToast(err.message || `Network error removing access for ${staffName}`)
    } finally {
      setIsSyncing(false)
    }
  }

  // Execute reset all overrides
  const handleExecuteResetAll = async () => {
    setIsResetConfirmOpen(false)
    const defaultMap: OverrideMap = { accountant: [], coordinator: [], hr: [] }
    const defaultMeta: OverrideMetadataMap = { accountant: {}, coordinator: {}, hr: {} }

    const previousOverrides = overrides
    const previousMeta = metadata

    // Optimistic UI update
    setOverrides(defaultMap)
    setMetadata(defaultMeta)
    saveSystemOverrides(defaultMap, defaultMeta)
    setIsSyncing(true)

    try {
      const res = await resetAllPersistentOverrides()
      if (!res.success) {
        setOverrides(previousOverrides)
        setMetadata(previousMeta)
        saveSystemOverrides(previousOverrides, previousMeta)
        showErrorToast(res.error || 'Failed to reset access.')
      } else {
        showToast('All department workstations reset to standard role boundaries.')
      }
    } catch (err: any) {
      setOverrides(previousOverrides)
      setMetadata(previousMeta)
      saveSystemOverrides(previousOverrides, previousMeta)
      showErrorToast(err.message || 'Error occurred while resetting access.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Render department status information
  const getDeptStatus = (dept: DepartmentConfig) => {
    const foreignDelegations = activeCoverageList.filter(
      (item) => item.targetDeptLabel === dept.label && item.coveringRoleKey !== dept.roleKey
    )

    if (foreignDelegations.length > 0) {
      const first = foreignDelegations[0]
      return {
        isElevated: true,
        badgeText: `Temporary: ${first.moduleName.split(' ')[0]}`,
        statusDetail: `Covered by ${first.coveringStaffName.split(' ')[0]} (${first.remainingText})`,
        canRevokeFirst: first,
      }
    }

    return {
      isElevated: false,
      badgeText: 'Standard Scope',
      statusDetail: 'Standard Scope',
      canRevokeFirst: null,
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      
      {/* Toast Notifications */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#18181B] dark:bg-[#F4F4F6] text-[#FAF9FB] dark:text-[#18181B] text-xs font-semibold shadow-xl transition-all animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {errorNotification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-600 text-[#FAF9FB] text-xs font-semibold shadow-xl transition-all animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorNotification}</span>
        </div>
      )}

      {/* 1. Header Command Bar */}
      <header className="px-8 py-5 border-b border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between shrink-0 bg-[#F5F4F7] dark:bg-[#22232A]">
        <div>
          {/* Eyebrow Navigation */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#8E8D9A] dark:text-[#7A7C88] tracking-wider uppercase">
            <span>TechnoCycle</span>
            <span>/</span>
            <span className="text-[#121215] dark:text-[#F4F4F6]">Executive Suite</span>
          </div>

          {/* Title Row */}
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-bold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
              Department Access & Coverage
            </h1>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EBEAEF] dark:bg-[#343640] border border-black/[0.04] dark:border-white/[0.06] text-[11px] font-medium text-[#575762] dark:text-[#B0B2BD]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All 3 Workstations Operational</span>
            </div>
          </div>
        </div>

        {/* Action Button: Primary Indigo Identity */}
        <div className="flex items-center gap-3">
          <button
            id="btn-delegate-coverage"
            onClick={() => handleOpenDelegation()}
            className="inline-flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-full bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] text-xs font-bold shadow-md hover:translate-y-[-1px] active:scale-[0.98] transition-all group cursor-pointer"
          >
            <span>Give Temporary Access</span>
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </header>

      {/* 2. Scrollable Operational Canvas */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-7">

        {/* Operational Signals Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Signal 1: Active Temporary Access */}
          <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-5 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E8D9A] dark:text-[#7A7C88]">
                Active Temporary Access
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
                  {activePermissionCount}
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {activePermissionCount === 1 ? '1 permission active' : `${activePermissionCount} permissions active`}
                </span>
              </div>
              <div className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-1.5 truncate max-w-[220px]">
                {delegationSummaryText}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          {/* Signal 2: Staff Absent Today */}
          <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-5 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E8D9A] dark:text-[#7A7C88]">
                Staff Absent Today
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
                  {absencesToday.length}
                </span>
                <span className="text-xs font-semibold text-[#8E8D9A] dark:text-[#7A7C88]">
                  {absencesToday.length > 0 ? 'On Leave' : 'Present'}
                </span>
              </div>
              <div className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-1.5 truncate max-w-[220px]">
                {absencesToday.length > 0
                  ? `${absencesToday[0].name} on ${absencesToday[0].leaveType}`
                  : 'All 3 department heads are on duty'}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          {/* Signal 3: Access Tracking */}
          <div className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-5 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E8D9A] dark:text-[#7A7C88]">
                Access Tracking
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  Enabled
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Monitored
                </span>
              </div>
              <div className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-1.5">
                All temporary access changes are logged
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

        </section>

        {/* Department Overview */}
        <section id="departments" className="pt-1">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8E8D9A] dark:text-[#7A7C88]">
                Department Overview
              </h2>
              <p className="text-[11px] text-[#575762] dark:text-[#B0B2BD] mt-0.5">
                Assign temporary coverage or inspect department access
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {EXECUTIVE_DEPARTMENTS.map((dept) => {
              const status = getDeptStatus(dept)

              return (
                <div
                  key={dept.id}
                  className={`bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl border ${
                    status.isElevated
                      ? 'border-amber-400/60 dark:border-amber-500/50 ring-1 ring-amber-400/30'
                      : 'border-black/[0.06] dark:border-white/[0.08]'
                  } p-6 flex flex-col justify-between shadow-sm hover:translate-y-[-1px] transition-all`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl ${dept.avatarColor} flex items-center justify-center text-xs font-extrabold shrink-0`}
                        >
                          {dept.avatarText}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#121215] dark:text-[#F4F4F6]">
                            {dept.label}
                          </div>
                          <div className="text-[11px] text-[#575762] dark:text-[#B0B2BD] mt-0.5">
                            Head: {dept.headName}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          status.isElevated
                            ? 'bg-[#FEF8ED] border border-[#FCE1B6] text-[#92530C] dark:bg-amber-950/40 dark:border-amber-800/50 dark:text-amber-300'
                            : 'bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-300'
                        }`}
                      >
                        {status.badgeText}
                      </span>
                    </div>

                    {/* Permissions Breakdown List */}
                    <div className="mt-5 pt-4 border-t border-black/[0.05] dark:border-white/[0.07] space-y-2.5 text-xs">
                      {dept.id === 'service' && (
                        <>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>Fleet GPS Tracking:</span>
                            <span
                              className={`font-semibold ${
                                status.isElevated
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-[#121215] dark:text-[#F4F4F6]'
                              }`}
                            >
                              {status.isElevated ? status.statusDetail : 'Standard Scope'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>Dispatch & Scheduling:</span>
                            <span className="font-semibold text-[#121215] dark:text-[#F4F4F6]">
                              Standard Scope
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>Tool & Inventory:</span>
                            <span className="font-semibold text-[#121215] dark:text-[#F4F4F6]">
                              Standard Scope
                            </span>
                          </div>
                        </>
                      )}

                      {dept.id === 'accountant' && (
                        <>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>Payroll & Audit Logs:</span>
                            <span className="font-semibold text-[#121215] dark:text-[#F4F4F6]">
                              {status.isElevated ? status.statusDetail : 'Standard Scope'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>Staff Attendance:</span>
                            <span
                              className={`font-semibold ${
                                absencesToday.some((a) => a.role.toLowerCase().includes('accountant'))
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {absencesToday.some((a) => a.role.toLowerCase().includes('accountant'))
                                ? 'Alicia on Medical Leave'
                                : 'Alicia on Duty'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>Coverage Status:</span>
                            <span className="font-semibold text-[#8E8D9A] dark:text-[#7A7C88]">
                              {status.isElevated ? 'Active Delegation' : 'No Active Delegates'}
                            </span>
                          </div>
                        </>
                      )}

                      {dept.id === 'hr' && (
                        <>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>Tickets & Leave Requests:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Operational
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>201 Personnel Records:</span>
                            <span className="font-semibold text-[#121215] dark:text-[#F4F4F6]">
                              Standard Scope
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#575762] dark:text-[#B0B2BD]">
                            <span>External Coverage:</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {activeCoverageList.some((item) => item.coveringRoleKey === 'hr')
                                ? 'Covering Service Dept'
                                : 'None'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-5 pt-4 border-t border-black/[0.05] dark:border-white/[0.07] flex gap-2">
                    {status.canRevokeFirst && (
                      <button
                        onClick={() =>
                          setRevokeTarget({
                            roleKey: status.canRevokeFirst!.coveringRoleKey,
                            moduleId: status.canRevokeFirst!.moduleId,
                            moduleName: status.canRevokeFirst!.moduleName,
                            staffName: status.canRevokeFirst!.coveringStaffName,
                            deptLabel: dept.label,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                      >
                        Remove Access
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenDelegation(dept.id)}
                      className="flex-1 py-2 px-3.5 rounded-xl text-xs font-semibold bg-[#EBEAEF] dark:bg-[#343640] text-[#121215] dark:text-[#F4F4F6] border border-black/[0.04] dark:border-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-center"
                    >
                      {status.isElevated ? 'Add Access' : 'Give Access'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 3. Active Temporary Access Ledger */}
        <section id="temporary-access" className="bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-[#121215] dark:text-[#F4F4F6]">
                Active Temporary Access
              </div>
              <div className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-0.5">
                Employees currently granted temporary access to departmental systems
              </div>
            </div>

            {/* Secondary Action: Clear All Access (Subtly positioned, non-competing) */}
            <div className="flex items-center gap-3">
              {activePermissionCount > 0 && (
                <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 rounded transition-colors"
                >
                  Clear All Access
                </button>
              )}
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#EBEAEF] dark:bg-[#343640] text-[#575762] dark:text-[#B0B2BD] border border-black/[0.04] dark:border-white/[0.06]">
                Access expires automatically
              </span>
            </div>
          </div>

          {activeCoverageList.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <ShieldCheck className="w-9 h-9 text-emerald-500 mb-2 stroke-[1.5]" />
              <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                All Departments Operating Within Standard Role Boundaries
              </div>
              <div className="text-xs text-[#8E8D9A] dark:text-[#7A7C88] mt-1 max-w-sm">
                No temporary access or cross-department coverage is currently active.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/[0.05] dark:border-white/[0.07] text-[10px] font-bold uppercase tracking-wider text-[#8E8D9A] dark:text-[#7A7C88]">
                    <th className="py-2.5 px-3">Covering Employee</th>
                    <th className="py-2.5 px-3">Covered Department</th>
                    <th className="py-2.5 px-3">Granted Access</th>
                    <th className="py-2.5 px-3">Expires In</th>
                    <th className="py-2.5 px-3">Why Access Needed</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                  {activeCoverageList.map((item, idx) => (
                    <tr key={`${item.coveringRoleKey}-${item.moduleId}-${idx}`}>
                      {/* Covering Employee */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 font-semibold text-[#121215] dark:text-[#F4F4F6]">
                          <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center">
                            {item.coveringRoleKey === 'hr' ? 'HR' : item.coveringRoleKey === 'coordinator' ? 'SD' : 'AC'}
                          </span>
                          <span>{item.coveringStaffName}</span>
                        </div>
                      </td>

                      {/* Covered Department */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#121215] dark:text-[#F4F4F6]">
                          {item.targetDeptLabel}
                        </span>
                      </td>

                      {/* Granted Access */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#FEF8ED] border border-[#FCE1B6] text-[#92530C] dark:bg-amber-950/40 dark:border-amber-800/50 dark:text-amber-300">
                          <Layers className="w-3 h-3" />
                          <span>{item.moduleName}</span>
                        </span>
                      </td>

                      {/* Expires In */}
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {item.remainingText}
                      </td>

                      {/* Why Access Needed */}
                      <td className="py-3 px-3 text-xs italic text-[#8E8D9A] dark:text-[#7A7C88] max-w-[240px] truncate">
                        &quot;{item.reason}&quot;
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() =>
                            setRevokeTarget({
                              roleKey: item.coveringRoleKey,
                              moduleId: item.moduleId,
                              moduleName: item.moduleName,
                              staffName: item.coveringStaffName,
                              deptLabel: item.targetDeptLabel,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                        >
                          Remove Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* 4. Executive Clean Footer */}
      <footer className="px-8 py-3.5 border-t border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between text-xs text-[#8E8D9A] dark:text-[#7A7C88] bg-[#F5F4F7] dark:bg-[#22232A] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>
            Logged in as <strong className="text-[#121215] dark:text-[#F4F4F6]">Carlos Rivera (CEO)</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>TechnoCycle Operational Network</span>
          <span>•</span>
          <span>All Systems Secure</span>
        </div>
      </footer>

      {/* 5. Granular Capability Delegation Modal (Fixed Height: Zero Jump, Cumulative Count) */}
      {isDelegationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="w-full max-w-[530px] bg-[#F5F4F7] dark:bg-[#22232A] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] shadow-2xl p-5 md:p-6 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-1 border-b border-black/[0.05] dark:border-white/[0.07]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#4D55CC] dark:text-[#818cf8]">
                  Temporary Assignment
                </div>
                <div className="text-base font-extrabold text-[#121215] dark:text-[#F4F4F6]">
                  Give Temporary Access
                </div>
                <div className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-0.5">
                  Choose an employee and select the departments or permissions they need to cover.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDelegationOpen(false)}
                className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDelegation} className="space-y-3.5">
              
              {/* Step 1: Who receives access */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                  1. Who needs temporary access?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RECIPIENT_OPTIONS.filter((r) => r.roleKey !== 'accountant').map((opt) => (
                    <div
                      key={opt.roleKey}
                      onClick={() => setSelectedRecipient(opt.roleKey)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        selectedRecipient === opt.roleKey
                          ? 'border-[#4D55CC] dark:border-[#818cf8] bg-[#EBEAEF] dark:bg-[#343640] ring-1 ring-[#4D55CC]/30'
                          : 'border-black/[0.06] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#2B2C35] hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg ${opt.avatarColor} text-xs font-extrabold flex items-center justify-center shrink-0`}>
                        {opt.avatarText}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                          {opt.name}
                        </div>
                        <div className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88]">
                          {opt.deptKey}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Department Segmented Tab Bar + Stable Capability Stage */}
              <div className="space-y-1.5 pt-1 border-t border-black/[0.05] dark:border-white/[0.07]">
                <div className="flex items-center justify-between text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                  <span>2. Choose Department & Access</span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllInTab}
                    className="text-[#4D55CC] dark:text-[#818cf8] font-semibold text-[11px] hover:underline cursor-pointer"
                  >
                    Select All in {EXECUTIVE_DEPARTMENTS.find((d) => d.id === activeDeptTab)?.label}
                  </button>
                </div>

                {/* Clean Department Tab Names: Service Dept | Accountant | HR */}
                <div className="flex gap-1.5 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
                  {EXECUTIVE_DEPARTMENTS.map((dept) => {
                    const count = getSelectedCountInDept(dept.id)
                    const isActive = activeDeptTab === dept.id

                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setActiveDeptTab(dept.id)}
                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#121215] dark:text-[#F4F4F6] shadow-sm font-bold'
                            : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
                        }`}
                      >
                        <span>{dept.label}</span>
                        {count > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#FEF8ED] border border-[#FCE1B6] text-[#92530C] dark:bg-amber-950/40 dark:border-amber-800/50 dark:text-amber-300">
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Stable Fixed-Height Capability Container (h-[160px]: Fits cleanly on screen) */}
                <div className="h-[160px] overflow-y-auto pr-1 space-y-1.5">
                  {EXECUTIVE_DEPARTMENTS.find((d) => d.id === activeDeptTab)?.moduleIds.map((modId) => {
                    const tab = TAB_CONFIGS[modId]
                    if (!tab) return null
                    const isChecked = selectedModuleIds.has(modId)
                    const IconComponent = tab.icon

                    return (
                      <div
                        key={modId}
                        onClick={() => handleToggleModule(modId)}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'border-[#4D55CC] dark:border-[#818cf8] bg-[#EBEAEF] dark:bg-[#343640] ring-1 ring-[#4D55CC]/30'
                            : 'border-black/[0.06] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#2B2C35] hover:border-black/20 dark:hover:border-white/20'
                        }`}
                      >
                        {/* Custom Checkbox */}
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors shrink-0 ${
                            isChecked
                              ? 'bg-[#4D55CC] border-[#4D55CC] text-[#FAF9FB]'
                              : 'border-[#8E8D9A] dark:border-[#7A7C88]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Capability Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IconComponent className="w-3.5 h-3.5 text-[#575762] dark:text-[#B0B2BD]" />
                            <span className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                              {tab.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#575762] dark:text-[#B0B2BD] mt-0.5 leading-relaxed">
                            {tab.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Step 3: Coverage Duration Chips */}
              <div className="space-y-1.5 pt-1 border-t border-black/[0.05] dark:border-white/[0.07]">
                <label className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                  3. How long is access needed?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: '1_day' as OverrideDuration, label: '24 Hours', sub: 'Auto-expires' },
                    { key: '2_days' as OverrideDuration, label: '48 Hours', sub: 'Weekend' },
                    { key: '7_days' as OverrideDuration, label: '7 Days', sub: '1 Week' },
                    { key: 'indefinite' as OverrideDuration, label: 'Until Revoked', sub: 'Manual' },
                  ].map((chip) => (
                    <div
                      key={chip.key}
                      onClick={() => setSelectedDuration(chip.key)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                        selectedDuration === chip.key
                          ? 'border-[#4D55CC] dark:border-[#818cf8] bg-[#EBEAEF] dark:bg-[#343640] ring-1 ring-[#4D55CC]/30'
                          : 'border-black/[0.06] dark:border-white/[0.08] bg-[#FAF9FB] dark:bg-[#2B2C35]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                        {chip.label}
                      </div>
                      <div className="text-[9px] text-[#8E8D9A] dark:text-[#7A7C88]">
                        {chip.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 4: Audit Reason */}
              <div className="space-y-1.5 pt-1 border-t border-black/[0.05] dark:border-white/[0.07]">
                <label className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                  4. Why is this access needed?
                </label>
                <input
                  type="text"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="e.g. Covering for an accountant who is on leave"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9FB] dark:bg-[#2B2C35] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[#121215] dark:text-[#F4F4F6] placeholder:text-[#8E8D9A] dark:placeholder:text-[#7A7C88] focus:outline-none focus:ring-1 focus:ring-[#4D55CC]"
                />
              </div>

              {/* Step 5: Compact Streamlined Assignment Summary Strip (Integrated, Zero Scrollbar Clutter) */}
              <div className="p-2.5 rounded-xl bg-[#EBEAEF] dark:bg-[#343640] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[#121215] dark:text-[#F4F4F6] shrink-0">
                    {RECIPIENT_OPTIONS.find((r) => r.roleKey === selectedRecipient)?.name}:
                  </span>
                  <span className="text-[#575762] dark:text-[#B0B2BD] truncate text-[11px]">
                    {selectedModuleNames.length > 0
                      ? selectedModuleNames.join(', ')
                      : 'None selected'}
                  </span>
                </div>
                <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px] shrink-0">
                  {selectedDuration === '1_day'
                    ? '24 Hours'
                    : selectedDuration === '2_days'
                    ? '48 Hours'
                    : selectedDuration === '7_days'
                    ? '7 Days'
                    : 'Until Revoked'}
                </span>
              </div>

              {/* Actions: Primary Indigo Action Button */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setIsDelegationOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedModuleIds.size === 0 || isSyncing}
                  className="px-5 py-2.5 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] text-xs font-bold shadow-md hover:translate-y-[-1px] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    Grant Temporary Access ({selectedModuleIds.size} {selectedModuleIds.size === 1 ? 'Permission' : 'Permissions'})
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Revocation Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="w-full max-w-[420px] bg-[#F5F4F7] dark:bg-[#22232A] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#121215] dark:text-[#F4F4F6]">
                  Remove Temporary Access
                </div>
                <div className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-1 leading-relaxed">
                  Remove <strong>{revokeTarget.staffName}</strong>&apos;s temporary access to{' '}
                  <strong>{revokeTarget.moduleName}</strong> in <strong>{revokeTarget.deptLabel}</strong>? Access will immediately return to standard boundaries.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.05] dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleExecuteRevoke}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-[#FAF9FB] text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Reset All Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="w-full max-w-[420px] bg-[#F5F4F7] dark:bg-[#22232A] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-300 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#121215] dark:text-[#F4F4F6]">
                  Clear All Temporary Access
                </div>
                <div className="text-xs text-[#575762] dark:text-[#B0B2BD] mt-1 leading-relaxed">
                  This will immediately return all employees across Service Dept, Accountant, and HR to standard role boundaries.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.05] dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteResetAll}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-[#FAF9FB] text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Confirm Clear All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
