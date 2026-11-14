// usePolicies: loads policies, signatures and staff, and works out who still has to sign each policy.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAllPolicies, getPolicyAcknowledgments, type CompanyPolicy, type PolicyAcknowledgmentItem } from '@/app/actions/policies'
import { useToast } from '@/components/ui'

export type StaffMember = { id: string; full_name: string; role: string }

export interface Signatures {
  signed: PolicyAcknowledgmentItem[]
  /** People in the audience who haven't signed this version. */
  unsigned: StaffMember[]
  eligible: number
}

const FIELD_ROLES = ['technician', 'helper']
const OFFICE_ROLES = ['ceo', 'hr', 'coordinator']

export function usePolicies() {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [policies, setPolicies] = useState<CompanyPolicy[]>([])
  const [acks, setAcks] = useState<PolicyAcknowledgmentItem[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [pol, ack, people] = await Promise.all([
      getAllPolicies(),
      getPolicyAcknowledgments(),
      supabase.from('profiles').select('id, full_name, role').neq('lifecycle_status', 'archived').order('full_name'),
    ])
    if (!pol.success) toast.error("Couldn't load policies. Refresh the page.")
    setPolicies(pol.success ? pol.policies : [])
    setAcks(ack.success ? ack.acknowledgments : [])
    setStaff((people.data ?? []) as StaffMember[])
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    load()
  }, [load])

  /** Signed and unsigned people for every policy, for its current version and audience. */
  const signatures = useMemo(() => {
    const map: Record<string, Signatures> = {}
    for (const p of policies) {
      const audience = staff.filter((s) =>
        p.target_audience === 'technician' ? FIELD_ROLES.includes(s.role) : p.target_audience === 'admin' ? OFFICE_ROLES.includes(s.role) : true,
      )
      const signed = acks.filter((a) => a.policy_id === p.id && a.policy_version === p.version)
      const signedIds = new Set(signed.map((a) => a.user_id))
      map[p.id] = { signed, unsigned: audience.filter((s) => !signedIds.has(s.id)), eligible: audience.length }
    }
    return map
  }, [policies, acks, staff])

  return { policies, signatures, loading, load }
}
