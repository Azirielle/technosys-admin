'use client'

import { useState, useEffect, useTransition } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ModalDialog from '@/components/ui/ModalDialog'
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard'
import {
  TableContainer,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  MutedBadge,
} from '@/components/ui/DataTable'
import {
  ShieldCheck,
  RefreshCw,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Loader2,
  Clock,
  X,
  Plus,
} from 'lucide-react'
import {
  SYSTEM_MODULES,
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
  grantAllPersistentOverrides,
  resetAllPersistentOverrides,
} from '@/app/actions/system-overrides'

const ROLES: { key: RoleKey; label: string; sub: string; badgeColor: string }[] = [
  { key: 'accountant', label: 'Accountant', sub: 'Finance & Payroll', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'coordinator', label: 'Field Operations', sub: 'Logistics & Dispatch', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'hr', label: 'HR Department', sub: 'People & Compliance', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
]

export default function SystemOverridesClient() {
  const [overrides, setOverrides] = useState<OverrideMap>({ accountant: [], coordinator: [], hr: [] })
  const [metadata, setMetadata] = useState<OverrideMetadataMap>({ accountant: {}, coordinator: {}, hr: {} })
  const [loading, setLoading] = useState<boolean>(true)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [errorNotification, setErrorNotification] = useState<string | null>(null)

  // Duration Modal State
  const [durationModal, setDurationModal] = useState<{
    isOpen: boolean;
    role: RoleKey;
    roleLabel: string;
    moduleId: string;
    moduleName: string;
    selectedDuration: OverrideDuration;
  } | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        const res = await getPersistentOverrides()
        if (mounted && res.success) {
          setOverrides(res.overrides)
          setMetadata(res.metadata)
          saveSystemOverrides(res.overrides, res.metadata)
        }
      } catch (err) {
        console.error('Failed to load initial persistent overrides:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()

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

  const showNotification = (msg: string) => {
    setErrorNotification(null)
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const showError = (msg: string) => {
    setNotification(null)
    setErrorNotification(msg)
    setTimeout(() => setErrorNotification(null), 5000)
  }

  // Revoke an active override immediately
  const revokeOverride = async (role: RoleKey, moduleId: string, moduleName: string) => {
    const currentList = overrides[role] || []
    const updatedList = currentList.filter(id => id !== moduleId)

    const updatedRoleMeta = { ...(metadata[role] || {}) }
    delete updatedRoleMeta[moduleId]

    const previousOverrides = overrides
    const previousMeta = metadata

    const newOverrides: OverrideMap = { ...overrides, [role]: updatedList }
    const newMetadata: OverrideMetadataMap = { ...metadata, [role]: updatedRoleMeta }

    setOverrides(newOverrides)
    setMetadata(newMetadata)
    saveSystemOverrides(newOverrides, newMetadata)
    setIsSyncing(true)

    const roleLabel = ROLES.find(r => r.key === role)?.label || role

    try {
      const res = await updatePersistentOverride(role, updatedList, updatedRoleMeta)
      if (!res.success) {
        setOverrides(previousOverrides)
        setMetadata(previousMeta)
        saveSystemOverrides(previousOverrides, previousMeta)
        showError(res.error || `Failed to revoke override for ${roleLabel}`)
      } else {
        showNotification(`Override revoked: "${moduleName}" access restored to default restriction for ${roleLabel}.`)
      }
    } catch (err: any) {
      setOverrides(previousOverrides)
      setMetadata(previousMeta)
      saveSystemOverrides(previousOverrides, previousMeta)
      showError(err.message || `Network error while revoking override for ${roleLabel}`)
    } finally {
      setIsSyncing(false)
    }
  }

  // Grant an override with selected duration
  const confirmGrantOverride = async () => {
    if (!durationModal) return
    const { role, moduleId, moduleName, selectedDuration, roleLabel } = durationModal

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

    const currentList = overrides[role] || []
    const updatedList = currentList.includes(moduleId) ? currentList : [...currentList, moduleId]

    const updatedRoleMeta: Record<string, OverrideMetadataItem> = {
      ...(metadata[role] || {}),
      [moduleId]: {
        duration: selectedDuration,
        expires_at: expiresAt,
        granted_at: new Date().toISOString(),
        granted_by_name: 'CEO Administrator'
      }
    }

    const previousOverrides = overrides
    const previousMeta = metadata

    const newOverrides: OverrideMap = { ...overrides, [role]: updatedList }
    const newMetadata: OverrideMetadataMap = { ...metadata, [role]: updatedRoleMeta }

    setOverrides(newOverrides)
    setMetadata(newMetadata)
    saveSystemOverrides(newOverrides, newMetadata)
    setDurationModal(null)
    setIsSyncing(true)

    const durationLabel = selectedDuration === '1_day' ? '1 Day (24 Hours)'
      : selectedDuration === '2_days' ? '2 Days (48 Hours)'
      : selectedDuration === '7_days' ? '7 Days (1 Week)'
      : 'Indefinite'

    try {
      const res = await updatePersistentOverride(role, updatedList, updatedRoleMeta)
      if (!res.success) {
        setOverrides(previousOverrides)
        setMetadata(previousMeta)
        saveSystemOverrides(previousOverrides, previousMeta)
        showError(res.error || `Failed to grant override for ${roleLabel}`)
      } else {
        showNotification(`Overridden: "${moduleName}" granted to ${roleLabel} for ${durationLabel}!`)
      }
    } catch (err: any) {
      setOverrides(previousOverrides)
      setMetadata(previousMeta)
      saveSystemOverrides(previousOverrides, previousMeta)
      showError(err.message || `Network error granting override for ${roleLabel}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleGrantAll = async () => {
    const allOverrides: OverrideMap = {
      accountant: SYSTEM_MODULES.filter(m => !m.defaultRoles.includes('accountant')).map(m => m.id),
      coordinator: SYSTEM_MODULES.filter(m => !m.defaultRoles.includes('coordinator')).map(m => m.id),
      hr: SYSTEM_MODULES.filter(m => !m.defaultRoles.includes('hr')).map(m => m.id),
    }

    const previousOverrides = overrides
    setOverrides(allOverrides)
    saveSystemOverrides(allOverrides)
    setIsSyncing(true)

    try {
      const res = await grantAllPersistentOverrides()
      if (!res.success) {
        setOverrides(previousOverrides)
        saveSystemOverrides(previousOverrides)
        showError(res.error || 'Failed to grant all persistent overrides')
      } else {
        showNotification('All cross-departmental overrides persisted to PostgreSQL and granted across all roles!')
      }
    } catch (err: any) {
      setOverrides(previousOverrides)
      saveSystemOverrides(previousOverrides)
      showError(err.message || 'Error occurred while granting all overrides')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleResetDefaults = async () => {
    const defaultMap: OverrideMap = { accountant: [], coordinator: [], hr: [] }
    const previousOverrides = overrides
    setOverrides(defaultMap)
    saveSystemOverrides(defaultMap)
    setIsSyncing(true)

    try {
      const res = await resetAllPersistentOverrides()
      if (!res.success) {
        setOverrides(previousOverrides)
        saveSystemOverrides(previousOverrides)
        showError(res.error || 'Failed to reset persistent overrides')
      } else {
        showNotification('All system overrides reset back to default role boundaries in PostgreSQL.')
      }
    } catch (err: any) {
      setOverrides(previousOverrides)
      saveSystemOverrides(previousOverrides)
      showError(err.message || 'Error occurred while resetting overrides')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden p-6">
      {/* Header Bar */}
      <PageHeader
        title="System Overrides & Access Matrix"
        subtitle="Pinnacle Chief Executive Officer access control. Persisted globally with auto-expiring time limits."
        icon={ShieldCheck}
        className="rounded-lg mb-4"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium font-mono">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            {isSyncing ? 'Syncing...' : 'Realtime Sync Active'}
          </span>
        }
        actions={
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleGrantAll}
              disabled={isSyncing || loading}
              className="inline-flex items-center gap-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-75 shadow-none cursor-pointer"
            >
              {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Grant All Overrides
            </button>
            <button
              onClick={handleResetDefaults}
              disabled={isSyncing || loading}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 disabled:opacity-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-75 shadow-none cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              Reset Defaults
            </button>
          </div>
        }
      />

      {/* CEO Governance KPI Telemetry Strip */}
      <KpiGrid columns={4}>
        <KpiCard
          label="Governance Scope"
          value={`${SYSTEM_MODULES.length}`}
          subtext="System modules managed"
          icon={ShieldCheck}
          variant="blue"
        />
        <KpiCard
          label="Active Overrides"
          value={`${Object.values(metadata).reduce((acc, roleMods) => acc + Object.values(roleMods).filter(m => isOverrideActive(m)).length, 0)}`}
          subtext="Temporary unlocks"
          icon={Unlock}
          variant={Object.values(metadata).reduce((acc, roleMods) => acc + Object.values(roleMods).filter(m => isOverrideActive(m)).length, 0) > 0 ? "amber" : "default"}
        />
        <KpiCard
          label="Standard Access"
          value={`${SYSTEM_MODULES.reduce((acc, m) => acc + m.defaultRoles.length, 0)}`}
          subtext="Role default permissions"
          icon={Lock}
          variant="emerald"
        />
        <KpiCard
          label="Audit Sync Status"
          value={isSyncing ? "Syncing" : "Realtime"}
          badge={isSyncing ? "Syncing" : "Protected"}
          badgeVariant={isSyncing ? "amber" : "emerald"}
          subtext="PostgreSQL WAL active"
          icon={RefreshCw}
          variant={isSyncing ? "amber" : "emerald"}
        />
      </KpiGrid>

      {/* Success Toast Notification */}
      {notification && (
        <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-xl flex items-center justify-between font-semibold shadow-2xs animate-in fade-in duration-150 shrink-0">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {notification}
          </span>
        </div>
      )}

      {/* Error Toast Notification */}
      {errorNotification && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-800 text-xs px-3.5 py-2 rounded-xl flex items-center justify-between font-semibold shadow-2xs animate-in fade-in duration-150 shrink-0">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            {errorNotification}
          </span>
        </div>
      )}

      {/* Main Override Matrix Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg overflow-hidden shadow-none flex-1 flex flex-col">
        <div className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300 text-xs">
            <Info className="w-3.5 h-3.5 text-zinc-400" />
            <span>Live Access Governance Matrix</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-400">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-zinc-400" /> Standard</span>
            <span className="flex items-center gap-1"><Unlock className="w-3 h-3 text-amber-500" /> Active Override</span>
          </div>
        </div>

        <TableContainer className="rounded-none border-x-0 border-t-0 border-b-0 flex-1 overflow-auto">
          <Table fixed>
            <TableHead sticky>
              <TableRow className="h-8">
                <TableHeaderCell width="34%">System Module & Scope</TableHeaderCell>
                {ROLES.map(role => (
                  <TableHeaderCell key={role.key} width="22%" align="center">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{role.label}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">{role.sub}</span>
                    </div>
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={`matrix-skel-${idx}`} className="h-12 border-b border-zinc-100 dark:border-zinc-800/60">
                    <TableCell>
                      <div className="flex flex-col gap-1.5 py-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3.5 w-32 bg-zinc-200/70 dark:bg-zinc-800 rounded animate-pulse" />
                          <div className="h-4 w-20 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
                        </div>
                        <div className="h-2.5 w-48 bg-zinc-100 dark:bg-zinc-800/50 rounded animate-pulse" />
                      </div>
                    </TableCell>
                    {ROLES.map(r => (
                      <TableCell key={r.key} align="center">
                        <div className="flex justify-center">
                          <div className="h-6 w-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-md animate-pulse" />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                SYSTEM_MODULES.map((mod) => (
                  <TableRow key={mod.id}>
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{mod.name}</span>
                          <MutedBadge>{mod.department}</MutedBadge>
                        </div>
                        <span className="text-[11px] text-zinc-400 truncate mt-0.5">{mod.description}</span>
                      </div>
                    </TableCell>

                    {ROLES.map(role => {
                      const isDefaultRole = mod.defaultRoles.includes(role.key)
                      const isGranted = (overrides[role.key] || []).includes(mod.id)
                      const itemMeta = metadata[role.key]?.[mod.id]
                      const isActive = isGranted && isOverrideActive(itemMeta)

                      return (
                        <TableCell key={role.key} align="center">
                          {isDefaultRole ? (
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-zinc-400 dark:text-zinc-500 bg-transparent">
                                <ShieldCheck className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                                <span>Default Scope</span>
                              </span>
                            </div>
                          ) : isActive ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                                <Unlock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                {itemMeta?.duration === 'indefinite' ? 'Indefinite Override' : (itemMeta?.duration?.replace('_', ' ') || 'Active Override')}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="font-mono tabular-nums text-zinc-400">
                                  {formatRemainingTime(itemMeta?.expires_at || null)}
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                <button
                                  type="button"
                                  onClick={() => revokeOverride(role.key, mod.id, mod.name)}
                                  disabled={isSyncing}
                                  className="font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-50"
                                >
                                  Revoke
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setDurationModal({
                                  isOpen: true,
                                  role: role.key,
                                  roleLabel: role.label,
                                  moduleId: mod.id,
                                  moduleName: mod.name,
                                  selectedDuration: '1_day'
                                })}
                                disabled={isSyncing}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 border border-zinc-200/90 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-800 shadow-2xs transition-all duration-75 cursor-pointer disabled:opacity-50 group"
                              >
                                <Plus className="w-3 h-3 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                                <span>Grant Override</span>
                              </button>
                            </div>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer info bar */}
        <div className="px-3.5 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span className="flex items-center gap-1.5 font-normal text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            Overrides persist in PostgreSQL and automatically expire according to designated CEO duration boundaries.
          </span>
          <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
            CEO Access Governance
          </span>
        </div>
      </div>

      {/* Override Duration Selector Modal */}
      <ModalDialog
        isOpen={!!durationModal?.isOpen}
        onClose={() => setDurationModal(null)}
        title="Grant System Override"
        subtitle="Configure duration limit for cross-departmental access"
        icon={Clock}
        maxWidth="md"
        footer={
          <div className="flex items-center gap-2 w-full justify-end">
            <button
              type="button"
              onClick={() => setDurationModal(null)}
              className="px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmGrantOverride}
              disabled={isSyncing}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white rounded-md text-xs font-medium shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSyncing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSyncing ? 'Granting...' : 'Grant Override Access'}
            </button>
          </div>
        }
      >
        {durationModal && (
          <div className="space-y-3.5 text-xs text-zinc-700 dark:text-zinc-300">
            {/* Target Scope Card */}
            <div className="p-3 bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-lg space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-medium text-[11px]">Target Role:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">{durationModal.roleLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-medium text-[11px]">Module Access:</span>
                <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">{durationModal.moduleName}</span>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Override Duration Limit
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: '1_day' as OverrideDuration, label: '1 Day', sub: '24 Hours' },
                  { key: '2_days' as OverrideDuration, label: '2 Days', sub: '48 Hours' },
                  { key: '7_days' as OverrideDuration, label: '7 Days', sub: '1 Week' },
                  { key: 'indefinite' as OverrideDuration, label: 'Indefinite', sub: 'Until Revoked' },
                ].map((tier) => {
                  const isSelected = durationModal.selectedDuration === tier.key
                  return (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setDurationModal({ ...durationModal, selectedDuration: tier.key })}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900/5 dark:bg-zinc-100/5 ring-1 ring-zinc-900/15 dark:ring-zinc-100/20 text-zinc-900 dark:text-zinc-100'
                          : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="font-semibold text-xs">{tier.label}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {tier.sub}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
              When the designated duration expires, module permissions automatically revert to Restricted mode across all staff devices.
            </p>
          </div>
        )}
      </ModalDialog>
    </div>
  )
}
