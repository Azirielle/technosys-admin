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
} from 'lucide-react'
import {
  SYSTEM_MODULES,
  subscribeToOverrideChanges,
  saveSystemOverrides,
  OverrideMap,
  RoleKey,
} from '@/lib/overrides'
import {
  getPersistentOverrides,
  updatePersistentOverride,
  grantAllPersistentOverrides,
  resetAllPersistentOverrides,
} from '@/app/actions/system-overrides'

const ROLES: { key: RoleKey; label: string; sub: string; badgeColor: string }[] = [
  { key: 'accountant', label: 'Accountant', sub: 'Finance & Payroll', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { key: 'coordinator', label: 'Field Operations', sub: 'Logistics & Dispatch', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'hr', label: 'HR Department', sub: 'People & Compliance', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
]

export default function SystemOverridesClient() {
  const [overrides, setOverrides] = useState<OverrideMap>({ accountant: [], coordinator: [], hr: [] })
  const [loading, setLoading] = useState<boolean>(true)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [errorNotification, setErrorNotification] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        const res = await getPersistentOverrides()
        if (mounted && res.success) {
          setOverrides(res.overrides)
          saveSystemOverrides(res.overrides)
        }
      } catch (err) {
        console.error('Failed to load initial persistent overrides:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()

    const unsubscribe = subscribeToOverrideChanges((fresh) => {
      if (mounted) {
        setOverrides(fresh)
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

  const toggleOverride = async (role: RoleKey, moduleId: string, moduleName: string) => {
    const currentList = overrides[role] || []
    const isGranted = currentList.includes(moduleId)
    
    let updatedList: string[]
    if (isGranted) {
      updatedList = currentList.filter(id => id !== moduleId)
    } else {
      updatedList = [...currentList, moduleId]
    }

    const previousOverrides = overrides
    const newOverrides: OverrideMap = {
      ...overrides,
      [role]: updatedList,
    }

    // Optimistic local update
    setOverrides(newOverrides)
    saveSystemOverrides(newOverrides)
    setIsSyncing(true)

    const roleLabel = ROLES.find(r => r.key === role)?.label || role
    const actionText = isGranted ? 'revoked from' : 'granted to'

    try {
      const res = await updatePersistentOverride(role, updatedList)
      if (!res.success) {
        // Rollback
        setOverrides(previousOverrides)
        saveSystemOverrides(previousOverrides)
        showError(res.error || `Failed to persist override update for ${roleLabel}`)
      } else {
        showNotification(`Overridden: "${moduleName}" access ${actionText} ${roleLabel}! (Cloud Synced)`)
      }
    } catch (err: any) {
      setOverrides(previousOverrides)
      saveSystemOverrides(previousOverrides)
      showError(err.message || `Network failure while persisting override for ${roleLabel}`)
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
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
              System Overrides & Access Matrix
            </h1>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {isSyncing ? 'Syncing to Cloud...' : 'PostgreSQL Realtime Sync Active'}
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Pinnacle Chief Executive Officer access control. Persisted globally to database with live cross-device sync.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={handleGrantAll}
            disabled={isSyncing || loading}
            className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <Zap className="w-4 h-4 text-indigo-600" />}
            Grant All Overrides
          </button>
          <button
            onClick={handleResetDefaults}
            disabled={isSyncing || loading}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Success Toast Notification */}
      {notification && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between font-bold shadow-sm animate-fade-in shrink-0">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {notification}
          </span>
        </div>
      )}

      {/* Error Toast Notification */}
      {errorNotification && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between font-bold shadow-sm animate-fade-in shrink-0">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            {errorNotification}
          </span>
        </div>
      )}

      {/* Main Override Matrix Table */}
      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
        <div className="p-4 bg-gray-50 border-b border-gray-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            <Info className="w-4 h-4 text-indigo-600" />
            Live Permission Matrix (Toggles dynamically expand sidebar navigation for each role)
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-gray-400" /> Default Access</span>
            <span className="flex items-center gap-1"><Unlock className="w-3.5 h-3.5 text-indigo-600" /> CEO Override</span>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs font-bold text-gray-500">Connecting to PostgreSQL permissions table...</span>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-300 table-fixed">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-300 px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[36%]">
                    System Module & Department
                  </th>
                  {ROLES.map(role => (
                    <th key={role.key} className="border border-gray-300 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-[21.3%]">
                      <div className="flex flex-col items-center">
                        <span className="text-gray-900 font-extrabold">{role.label}</span>
                        <span className="text-[10px] text-gray-500 normal-case font-normal">{role.sub}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {SYSTEM_MODULES.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="border border-gray-300 px-5 py-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{mod.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            {mod.department}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 font-medium leading-normal">{mod.description}</span>
                      </div>
                    </td>

                    {ROLES.map(role => {
                      const isDefaultRole = mod.defaultRoles.includes(role.key)
                      const isGranted = (overrides[role.key] || []).includes(mod.id)

                      return (
                        <td key={role.key} className="border border-gray-300 px-4 py-3.5 text-center align-middle">
                          {isDefaultRole ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <Lock className="w-3.5 h-3.5 text-emerald-600" />
                              Default Access
                            </span>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <button
                                onClick={() => toggleOverride(role.key, mod.id, mod.name)}
                                disabled={isSyncing}
                                className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                                  isGranted ? 'bg-indigo-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isGranted ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              <span className={`text-[10px] font-black uppercase tracking-wider ${isGranted ? 'text-indigo-600' : 'text-gray-400'}`}>
                                {isGranted ? '🔓 Override (Granted)' : 'Restricted'}
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
        <div className="p-3.5 bg-gray-50 border-t border-gray-300 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            System overrides persist across all devices in PostgreSQL and broadcast to active staff sidebars in real time.
          </span>
          <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
            CEO Master Access Control
          </span>
        </div>
      </div>
    </div>
  )
}
