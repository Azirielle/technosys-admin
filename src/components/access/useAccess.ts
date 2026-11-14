// useAccess: loads temporary access grants, who holds each office role, and who is on leave today; saves changes.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPersistentOverrides, getStaffAbsencesToday, updatePersistentOverride, type StaffAbsence } from '@/app/actions/system-overrides'
import {
  isOverrideActive,
  saveSystemOverrides,
  subscribeToOverrideChanges,
  type OverrideMap,
  type OverrideMetadataItem,
  type OverrideMetadataMap,
  type RoleKey,
} from '@/lib/overrides'

export interface Grant {
  role: RoleKey
  moduleId: string
  meta: OverrideMetadataItem
}

export function useAccess() {
  const supabase = useMemo(() => createClient(), [])
  const [overrides, setOverrides] = useState<OverrideMap>({ coordinator: [], hr: [] })
  const [metadata, setMetadata] = useState<OverrideMetadataMap>({ coordinator: {}, hr: {} })
  const [absences, setAbsences] = useState<StaffAbsence[]>([])
  const [people, setPeople] = useState<Record<RoleKey, string>>({ hr: 'HR', coordinator: 'Service Dept' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      getPersistentOverrides(),
      getStaffAbsencesToday(),
      supabase.from('profiles').select('full_name, role').in('role', ['hr', 'coordinator']),
    ]).then(([o, a, p]) => {
      if (!alive) return
      if (o.success) {
        setOverrides(o.overrides)
        setMetadata(o.metadata)
        saveSystemOverrides(o.overrides, o.metadata)
      }
      if (a.success) setAbsences(a.absences)
      const names = { hr: 'HR', coordinator: 'Service Dept' } as Record<RoleKey, string>
      for (const row of p.data ?? []) names[row.role as RoleKey] = row.full_name
      setPeople(names)
      setLoading(false)
    })
    const stop = subscribeToOverrideChanges((fresh, freshMeta) => {
      setOverrides(fresh)
      if (freshMeta) setMetadata(freshMeta)
    })
    return () => {
      alive = false
      stop()
    }
  }, [supabase])

  /** Every grant that hasn't ended, newest first. */
  const grants = useMemo(() => {
    const list: Grant[] = []
    for (const role of ['hr', 'coordinator'] as RoleKey[]) {
      for (const [moduleId, meta] of Object.entries(metadata[role] ?? {})) {
        if (isOverrideActive(meta)) list.push({ role, moduleId, meta })
      }
    }
    return list.sort((a, b) => (b.meta.granted_at || '').localeCompare(a.meta.granted_at || ''))
  }, [metadata])

  /** Saves one role's grants. Shows the change at once and puts it back if saving fails. */
  const saveRole = useCallback(
    async (role: RoleKey, list: string[], meta: Record<string, OverrideMetadataItem>) => {
      const before = { overrides, metadata }
      const nextOverrides = { ...overrides, [role]: list }
      const nextMeta = { ...metadata, [role]: meta }
      setOverrides(nextOverrides)
      setMetadata(nextMeta)
      saveSystemOverrides(nextOverrides, nextMeta)
      const res = await updatePersistentOverride(role, list, meta).catch((e: Error) => ({ success: false, error: e.message }))
      if (!res.success) {
        setOverrides(before.overrides)
        setMetadata(before.metadata)
        saveSystemOverrides(before.overrides, before.metadata)
      }
      return res
    },
    [overrides, metadata],
  )

  /** After "Remove all" succeeds on the server, empty the list here too. */
  const clearLocal = useCallback(() => {
    const empty = { overrides: { coordinator: [], hr: [] } as OverrideMap, metadata: { coordinator: {}, hr: {} } as OverrideMetadataMap }
    setOverrides(empty.overrides)
    setMetadata(empty.metadata)
    saveSystemOverrides(empty.overrides, empty.metadata)
  }, [])

  return { overrides, metadata, grants, absences, people, loading, saveRole, clearLocal }
}
