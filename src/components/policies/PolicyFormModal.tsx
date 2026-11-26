// PolicyFormModal: write a new policy draft or edit one (details, summary, text with a preview).
'use client'

import { useEffect, useRef, useState } from 'react'
import { Bold, FilePen, Heading, List } from 'lucide-react'
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

// C23: no "##" template any more (it looked machine-made); the buttons above the box add the formatting.
const STARTER_TEXT = ''

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
  const box = useRef<HTMLTextAreaElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setView(policy ? 'preview' : 'write') // an existing policy opens as it reads, not as markup
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
  /** Heading / bullet: marks the line the cursor is on; bold: wraps the selected words. */
  function format(kind: 'heading' | 'bullet' | 'bold') {
    const el = box.current
    const text = form.content_markdown
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    let next: string
    let cursor: number
    if (kind === 'bold') {
      const words = text.slice(start, end) || 'bold text'
      next = `${text.slice(0, start)}**${words}**${text.slice(end)}`
      cursor = start + words.length + 4
    } else {
      const mark = kind === 'heading' ? '## ' : '- '
      const lineStart = text.lastIndexOf('\n', start - 1) + 1
      next = text.slice(0, lineStart) + mark + text.slice(lineStart)
      cursor = end + mark.length
    }
    set('content_markdown', next)
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(cursor, cursor) })
  }
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
            <>
              <div className="flex gap-1" role="toolbar" aria-label="Formatting">
                <Button size="sm" variant="ghost" icon={Heading} onClick={() => format('heading')}>Heading</Button>
                <Button size="sm" variant="ghost" icon={List} onClick={() => format('bullet')}>Bullet</Button>
                <Button size="sm" variant="ghost" icon={Bold} onClick={() => format('bold')}>Bold</Button>
              </div>
              <Textarea ref={box} aria-label="Policy text" rows={12} value={form.content_markdown} onChange={(e) => set('content_markdown', e.target.value)}
                placeholder={'Write the policy in plain sentences.\nPut the cursor on a line and press Heading or Bullet; select words and press Bold.'} />
            </>
          ) : (
            <div className="min-h-64 rounded-control border border-line p-4">
              <FormattedPolicyDocument content={form.content_markdown} />
            </div>
          )}
          <p className="text-caption text-ink-3">Check Preview to see it the way people will read it.</p>
        </div>
      </div>
    </Modal>
  )
}
