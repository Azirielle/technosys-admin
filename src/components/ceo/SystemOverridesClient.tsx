'use client'

import { useState, useEffect } from 'react'
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
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                System Overrides & Access Matrix
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  {isSyncing ? 'Syncing...' : 'Realtime Sync Active'}
                </span>
              </h1>
              <p className="text-[11px] text-zinc-500 font-medium">
                Pinnacle Chief Executive Officer access control. Persisted globally with auto-expiring time limits.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleGrantAll}
            disabled={isSyncing || loading}
            className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Zap className="w-3.5 h-3.5 text-blue-600" />}
            Grant All Overrides
          </button>
          <button
            onClick={handleResetDefaults}
            disabled={isSyncing || loading}
            className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
            Reset Defaults
          </button>
        </div>
      </div>

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
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs flex-1 flex flex-col">
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-zinc-700 uppercase tracking-wider text-[11px]">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            Live Access Governance Matrix (Overrides dynamically unlock modules for cross-functional staff)
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-zinc-400" /> Default Access</span>
            <span className="flex items-center gap-1"><Unlock className="w-3 h-3 text-blue-600" /> CEO Time-Limited Override</span>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2.5">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <span className="text-xs font-semibold text-zinc-500">Connecting to PostgreSQL permissions table...</span>
            </div>
          ) : (
            <table className="w-full border-collapse table-fixed text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                  <th className="px-3.5 py-2.5 border-r border-zinc-200 w-[34%]">
                    System Module & Scope
                  </th>
                  {ROLES.map(role => (
                    <th key={role.key} className="px-3.5 py-2.5 border-r border-zinc-200 text-center w-[22%] last:border-r-0">
                      <div className="flex flex-col items-center">
                        <span className="text-zinc-900 font-bold">{role.label}</span>
                        <span className="text-[10px] text-zinc-500 normal-case font-medium">{role.sub}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {SYSTEM_MODULES.map((mod) => (
                  <tr key={mod.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-3.5 py-2.5 border-r border-zinc-200">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900">{mod.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {mod.department}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{mod.description}</span>
                      </div>
                    </td>

                    {ROLES.map(role => {
                      const isDefaultRole = mod.defaultRoles.includes(role.key)
                      const isGranted = (overrides[role.key] || []).includes(mod.id)
                      const itemMeta = metadata[role.key]?.[mod.id]
                      const isActive = isGranted && isOverrideActive(itemMeta)

                      return (
                        <td key={role.key} className="px-3 py-2 text-center align-middle border-r border-zinc-200 last:border-r-0">
                          {isDefaultRole ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              Default Access
                            </span>
                          ) : isActive ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                <Unlock className="w-3 h-3 text-blue-600" />
                                {itemMeta?.duration === 'indefinite' ? 'Indefinite' : (itemMeta?.duration?.replace('_', ' ') || 'Active')}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                {formatRemainingTime(itemMeta?.expires_at || null)}
                              </span>
                              <button
                                onClick={() => revokeOverride(role.key, mod.id, mod.name)}
                                disabled={isSyncing}
                                className="text-[10px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer mt-0.5 transition-colors disabled:opacity-50"
                              >
                                Revoke Access
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <button
                                onClick={() => setDurationModal({
                                  isOpen: true,
                                  role: role.key,
                                  roleLabel: role.label,
                                  moduleId: mod.id,
                                  moduleName: mod.name,
                                  selectedDuration: '1_day'
                                })}
                                disabled={isSyncing}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-zinc-200 text-zinc-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                <Lock className="w-3 h-3 text-zinc-400" />
                                Restricted
                              </button>
                              <span className="text-[9px] text-zinc-500 font-medium">
                                Click to Grant
                              </span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span className="flex items-center gap-1.5 font-medium text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Overrides persist in PostgreSQL and automatically expire according to designated CEO duration boundaries.
          </span>
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            CEO Access Governance
          </span>
        </div>
      </div>

      {/* Override Duration Selector Modal */}
      {durationModal?.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[75] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Grant System Override</h3>
                  <p className="text-[11px] text-zinc-500">Configure time limit for cross-departmental access</p>
                </div>
              </div>
              <button
                onClick={() => setDurationModal(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Target Role:</span>
                  <span className="font-bold text-zinc-900">{durationModal.roleLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Module Access:</span>
                  <span className="font-bold text-blue-600">{durationModal.moduleName}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Override Duration Limit
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: '1_day' as OverrideDuration, label: '1 Day', sub: '24 Hours' },
                    { key: '2_days' as OverrideDuration, label: '2 Days', sub: '48 Hours' },
                    { key: '7_days' as OverrideDuration, label: '7 Days', sub: '1 Week' },
                    { key: 'indefinite' as OverrideDuration, label: 'Indefinite', sub: 'Until Revoked' },
                  ].map((tier) => (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setDurationModal({ ...durationModal, selectedDuration: tier.key })}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        durationModal.selectedDuration === tier.key
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{tier.label}</div>
                      <div className="text-[10px] text-zinc-500 font-medium">{tier.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-zinc-500 italic">
                Note: When the designated duration expires, the module will automatically revert to Restricted mode across all staff devices.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setDurationModal(null)}
                className="flex-1 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmGrantOverride}
                disabled={isSyncing}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSyncing ? 'Granting...' : 'Grant Override Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
