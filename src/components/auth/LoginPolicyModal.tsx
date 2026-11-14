// LoginPolicyModal: the "you agree to the admin policies" link on the login page, and the dialog that shows them.
'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { getPublicPolicy, type CompanyPolicy } from '@/app/actions/policies'
import { formatDay } from '@/lib/format'
import { Button, Modal, Tabs } from '@/components/ui'
import FormattedPolicyDocument from '@/components/policies/FormattedPolicyDocument'

type PolicyId = 'executive_governance' | 'terms_of_service'

export function LoginPolicyModal() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<PolicyId>('executive_governance')
  const [policies, setPolicies] = useState<Partial<Record<PolicyId, CompanyPolicy | null>>>({})
  const [loading, setLoading] = useState(false)

  /** Loads a policy the first time its tab is shown. */
  async function show(id: PolicyId) {
    setTab(id)
    setOpen(true)
    if (id in policies) return
    setLoading(true)
    const res = await getPublicPolicy(id).catch(() => null)
    setPolicies((p) => ({ ...p, [id]: res?.success && res.policy ? res.policy : null }))
    setLoading(false)
  }

  const policy = policies[tab]

  return (
    <>
      <p className="text-caption text-ink-3">
        By signing in, you agree to the{' '}
        <button type="button" onClick={() => show('executive_governance')} className="cursor-pointer font-medium text-link underline-offset-2 hover:underline">
          admin policies
        </button>
        .
      </p>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        icon={ShieldCheck}
        title="Admin policies"
        subtitle="The rules for using the TechnoSys admin."
        maxWidth="2xl"
        contentHeight="max-h-[85vh]"
        footer={<Button onClick={() => setOpen(false)}>Close</Button>}
      >
        <div className="flex flex-col gap-4">
          <Tabs
            label="Policy"
            value={tab}
            onChange={show}
            items={[
              { value: 'executive_governance', label: 'Admin rules' },
              { value: 'terms_of_service', label: 'Terms of use' },
            ]}
          />
          {loading ? (
            <p className="py-10 text-center text-small text-ink-3">Loading…</p>
          ) : policy ? (
            <article>
              <p className="text-caption text-ink-3">{policy.version}{policy.effective_date ? ` · in effect since ${formatDay(policy.effective_date)}` : ''}</p>
              {policy.summary && <p className="mt-2 text-small text-ink-2">{policy.summary}</p>}
              <div className="mt-4 border-t border-line pt-4">
                <FormattedPolicyDocument content={policy.content_markdown} />
              </div>
            </article>
          ) : (
            <p className="py-10 text-center text-small text-ink-3">This policy couldn't be loaded. Ask HR for a copy.</p>
          )}
        </div>
      </Modal>
    </>
  )
}
