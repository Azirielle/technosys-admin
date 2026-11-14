// PolicyDrawer: one policy in a side panel — the text, who signed, its history, and the next action for its status.
'use client'

import { useEffect, useState } from 'react'
import { Archive, Check, FilePen, GitBranch, MessageSquareWarning, Send } from 'lucide-react'
import type { CompanyPolicy } from '@/app/actions/policies'
import { formatDay } from '@/lib/format'
import { Badge, Button, Drawer, Tabs } from '@/components/ui'
import FormattedPolicyDocument from './FormattedPolicyDocument'
import { PolicySignatures } from './PolicySignatures'
import { PolicyHistory } from './PolicyHistory'
import { STATUS, audienceLabel, categoryLabel, needsCoordinatorReview } from './policyLabels'
import type { Signatures } from './usePolicies'

type View = 'document' | 'signatures' | 'history'

export interface PolicyActions {
  onEdit: () => void
  onSubmit: () => void
  onPublish: () => void
  onRequestChanges: () => void
  onRevise: () => void
  onArchive: () => void
  onRemind: () => void
}

export function PolicyDrawer({
  policy,
  signatures,
  busy,
  onClose,
  actions,
}: {
  policy: CompanyPolicy | null
  signatures: Signatures | undefined
  /** An action is running (submit, revise, remind). */
  busy: boolean
  onClose: () => void
  actions: PolicyActions
}) {
  const [view, setView] = useState<View>('document')
  useEffect(() => setView('document'), [policy?.id])
  if (!policy) return null
  const status = STATUS[policy.status] ?? STATUS.draft

  const footer = {
    draft: (
      <>
        <Button variant="ghost" icon={FilePen} onClick={actions.onEdit}>Edit draft</Button>
        <Button variant="primary" icon={Send} loading={busy} onClick={actions.onSubmit}>Send for approval</Button>
      </>
    ),
    under_review: (
      <>
        <Button variant="ghost" icon={MessageSquareWarning} onClick={actions.onRequestChanges}>Ask for changes</Button>
        <Button variant="primary" icon={Check} onClick={actions.onPublish}>Approve and publish</Button>
      </>
    ),
    active: (
      <>
        <Button variant="ghost" icon={Archive} onClick={actions.onArchive}>Archive</Button>
        <Button variant="primary" icon={GitBranch} loading={busy} onClick={actions.onRevise}>Make a new version</Button>
      </>
    ),
    archived: undefined,
  }[policy.status]

  return (
    <Drawer
      isOpen
      onClose={onClose}
      width="xl"
      title={policy.title}
      subtitle={`${categoryLabel(policy.category)} · ${policy.version} · for ${audienceLabel(policy.target_audience).toLowerCase()}`}
      headerExtra={<Badge tone={status.tone} dot>{status.label}</Badge>}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        <Tabs
          label="Policy section"
          value={view}
          onChange={setView}
          items={[
            { value: 'document', label: 'Policy' },
            { value: 'signatures', label: 'Signatures', count: policy.status === 'active' ? signatures?.signed.length : undefined },
            { value: 'history', label: 'History' },
          ]}
        />

        {view === 'document' && (
          <>
            {policy.status === 'under_review' && (
              <p className="rounded-control bg-warning-soft p-3 text-small text-warning">
                {needsCoordinatorReview(policy)
                  ? 'Field work policy: check it with the Coordinator before you approve it.'
                  : 'Read it through, then approve it or ask for changes.'}
              </p>
            )}
            {policy.status === 'draft' && policy.review_notes && (
              <p className="rounded-control bg-surface-soft p-3 text-small text-ink-2">
                <span className="block text-caption font-medium text-ink-3">Changes asked for</span>
                {policy.review_notes}
              </p>
            )}
            {policy.summary && <p className="text-body text-ink-2">{policy.summary}</p>}
            <p className="text-caption text-ink-3">
              {policy.is_mandatory ? 'Must be signed' : 'Optional to sign'} · takes effect {policy.effective_date ? formatDay(policy.effective_date) : 'when published'}
            </p>
            <div className="border-t border-line pt-5">
              <FormattedPolicyDocument content={policy.content_markdown} />
            </div>
          </>
        )}
        {view === 'signatures' && <PolicySignatures policy={policy} signatures={signatures} reminding={busy} onRemind={actions.onRemind} />}
        {view === 'history' && <PolicyHistory policy={policy} />}
      </div>
    </Drawer>
  )
}
