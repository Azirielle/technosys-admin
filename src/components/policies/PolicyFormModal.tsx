// PolicyFormModal: write a new policy draft or edit one (details, summary, text with a preview).
'use client'

import { useEffect, useState } from 'react'
import { FilePen } from 'lucide-react'
import { createPolicyDraft, updatePolicyDraft, type CompanyPolicy, type PolicyCategory } from '@/app/actions/policies'
import { Button, Checkbox, Field, Input, Modal, Select, Tabs, Textarea } from '@/components/ui'
import FormattedPolicyDocument from './FormattedPolicyDocument'
import { AUDIENCES, CATEGORIES, daysFromToday, type Audience } from './policyLabels'

type Form = {
  title: string
  category: PolicyCategory
  target_audience: Audience
  effective_date: string
  summary: string
  content_markdown: string
  is_mandatory: boolean
}

const STARTER_TEXT = '## 1. Purpose\nWhy this policy exists.\n\n## 2. Who it covers\n\n## 3. Rules\n- \n'

export function PolicyFormModal({
  isOpen,
  policy,
  onClose,
  onSaved,
}: {
  isOpen: boolean
  /** null = new draft; otherwise edit this draft. */
  policy: CompanyPolicy | null
  onClose: () => void
  onSaved: (saved: CompanyPolicy) => void
}) {
  const [form, setForm] = useState<Form>({ title: '', category: 'hr_attendance', target_audience: 'all', effective_date: '', summary: '', content_markdown: '', is_mandatory: true })
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setView('write')
    setError(null)
    setForm({
      title: policy?.title ?? '',
      category: policy?.category ?? 'hr_attendance',
      target_audience: (policy?.target_audience as Audience) ?? 'all',
      effective_date: policy?.effective_date ?? daysFromToday(7),
      summary: policy?.summary ?? '',
      content_markdown: policy?.content_markdown ?? STARTER_TEXT,
      is_mandatory: policy?.is_mandatory ?? true,
    })
  }, [isOpen, policy])

  if (!isOpen) return null
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function save() {
    if (!form.title.trim()) return setError('Give the policy a title.')
    setSaving(true)
    setError(null)
    const payload = {
      ...form,
      title: form.title.trim(),
      summary: form.summary.trim() || 'Draft in progress.',
      content_markdown: form.content_markdown.trim() || `# ${form.title.trim()}`,
    }
    const res = policy ? await updatePolicyDraft({ id: policy.id, version: policy.version, ...payload }) : await createPolicyDraft({ version: 'v1.0.0-draft', ...payload })
    setSaving(false)
    if (res.success && res.policy) onSaved(res.policy)
    else setError(res.error || "Couldn't save the draft.")
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={FilePen}
      title={policy ? 'Edit draft' : 'New policy'}
      subtitle={policy ? `${policy.title} · ${policy.version}` : 'Saved as a draft. Nobody sees it until it is published.'}
      maxWidth="3xl"
      contentHeight="max-h-[90vh]"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Save draft</Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Field label="Title" htmlFor="pol-title" required error={error}>
          <Input id="pol-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Time-in and time-out rules" />
        </Field>
        <div className="grid grid-cols-1 gap-stack sm:grid-cols-3">
          <Field label="Category" htmlFor="pol-category">
            <Select id="pol-category" value={form.category} onChange={(e) => set('category', e.target.value as PolicyCategory)} options={CATEGORIES} />
          </Field>
          <Field label="Who it's for" htmlFor="pol-audience">
            <Select id="pol-audience" value={form.target_audience} onChange={(e) => set('target_audience', e.target.value as Audience)} options={[...AUDIENCES]} />
          </Field>
          <Field label="Takes effect" htmlFor="pol-date">
            <Input id="pol-date" type="date" value={form.effective_date} onChange={(e) => set('effective_date', e.target.value)} />
          </Field>
        </div>
        <Checkbox checked={form.is_mandatory} onChange={(e) => set('is_mandatory', e.target.checked)} label="Everyone it's for must sign it in the app" />
        <Field label="Summary" htmlFor="pol-summary" hint="One or two sentences. Shown at the top of the policy.">
          <Textarea id="pol-summary" rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Explains how and when to time in, and what happens when you're late." />
        </Field>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-ink-2">Policy text</span>
            <Tabs size="sm" label="Policy text view" value={view} onChange={setView} items={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]} />
          </div>
          {view === 'write' ? (
            <Textarea aria-label="Policy text" rows={12} className="font-mono text-caption" value={form.content_markdown} onChange={(e) => set('content_markdown', e.target.value)} />
          ) : (
            <div className="min-h-64 rounded-control border border-line p-4">
              <FormattedPolicyDocument content={form.content_markdown} />
            </div>
          )}
          <p className="text-caption text-ink-3">Use ## for headings, - for bullet points and **bold** for emphasis.</p>
        </div>
      </div>
    </Modal>
  )
}
