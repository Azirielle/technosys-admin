// PolicySignatures: who has signed the current version, who hasn't, and a button to remind the rest.
'use client'

import { Send, UserCheck } from 'lucide-react'
import type { CompanyPolicy } from '@/app/actions/policies'
import { formatDay } from '@/lib/format'
import { Avatar, Button, EmptyState } from '@/components/ui'
import { audienceLabel } from './policyLabels'
import type { Signatures } from './usePolicies'

const ROLE: Record<string, string> = { ceo: 'CEO', hr: 'HR', coordinator: 'Coordinator', technician: 'Technician', helper: 'Helper' }

export function PolicySignatures({
  policy,
  signatures,
  reminding,
  onRemind,
}: {
  policy: CompanyPolicy
  signatures: Signatures | undefined
  reminding: boolean
  onRemind: () => void
}) {
  if (policy.status !== 'active') {
    return <EmptyState icon={UserCheck} title="Not published yet" description="Signatures are collected in the app once this policy is published." />
  }
  if (!signatures) return null
  const { signed, unsigned, eligible } = signatures
  const percent = eligible ? Math.round((signed.length / eligible) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-small font-medium text-ink">{signed.length} of {eligible} signed</p>
          <p className="text-caption text-ink-3">{audienceLabel(policy.target_audience)} · {policy.version}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-soft" aria-hidden>
          <div className="h-full rounded-pill bg-success" style={{ width: `${percent}%` }} />
        </div>
        {!policy.is_mandatory && <p className="mt-2 text-caption text-ink-3">This policy is optional to sign.</p>}
      </div>

      {unsigned.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-caption font-medium text-ink-3">Not signed yet ({unsigned.length})</h3>
            <Button size="sm" icon={Send} loading={reminding} onClick={onRemind}>Remind them</Button>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {unsigned.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 py-2 text-small">
                <Avatar name={s.full_name} size="xs" />
                <span className="flex-1 text-ink">{s.full_name}</span>
                <span className="text-caption text-ink-3">{ROLE[s.role] ?? s.role}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-caption font-medium text-ink-3">Signed ({signed.length})</h3>
        {signed.length === 0 ? (
          <p className="text-small text-ink-3">No one has signed this version yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {signed.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 py-2 text-small">
                <Avatar name={a.user?.full_name || 'Staff'} size="xs" />
                <span className="flex-1 text-ink">{a.user?.full_name || 'Staff'}</span>
                <span className="text-caption text-ink-3">{formatDay(a.acknowledged_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
