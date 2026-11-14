// PolicyTable: one row per policy — title and category, status, signatures, last change, next step.
'use client'

import { ScrollText } from 'lucide-react'
import type { CompanyPolicy } from '@/app/actions/policies'
import { formatDay } from '@/lib/format'
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { STATUS, categoryLabel, nextStep } from './policyLabels'
import type { Signatures } from './usePolicies'

export function PolicyTable({
  policies,
  signatures,
  loading,
  emptyTitle,
  emptyText,
  onOpen,
}: {
  policies: CompanyPolicy[]
  signatures: Record<string, Signatures>
  loading: boolean
  emptyTitle: string
  emptyText: string
  onOpen: (p: CompanyPolicy) => void
}) {
  if (!loading && policies.length === 0) return <EmptyState icon={ScrollText} title={emptyTitle} description={emptyText} />
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Policy</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell numeric>Signed</TableHeaderCell>
          <TableHeaderCell>Last change</TableHeaderCell>
          <TableHeaderCell>Next step</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={5} className="py-10 text-center text-ink-3">Loading policies…</TableCell>
          </TableRow>
        )}
        {!loading &&
          policies.map((p) => {
            const sig = signatures[p.id]
            const unsigned = sig?.unsigned.length ?? 0
            const status = STATUS[p.status] ?? STATUS.draft
            return (
              <TableRow key={p.id} onClick={() => onOpen(p)}>
                <TableCell>
                  <span className="block font-medium">{p.title}</span>
                  <span className="block text-caption text-ink-3">
                    {categoryLabel(p.category)} · <span className="font-mono">{p.version}</span>
                  </span>
                </TableCell>
                <TableCell><Badge tone={status.tone} dot>{status.label}</Badge></TableCell>
                <TableCell numeric>
                  {p.status === 'active' && p.is_mandatory && sig ? (
                    <span className={unsigned ? 'text-warning' : 'text-success'}>{sig.signed.length} of {sig.eligible}</span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-ink-2">{formatDay(p.updated_at || p.created_at)}</TableCell>
                <TableCell className="text-ink-2">{nextStep(p, unsigned)}</TableCell>
              </TableRow>
            )
          })}
      </TableBody>
    </Table>
  )
}
