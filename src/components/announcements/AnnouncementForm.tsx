// AnnouncementForm: write or edit an announcement in a side panel — message, audience, priority, timing, push.
'use client'

import { useEffect, useState } from 'react'
import { saveAnnouncement } from '@/app/actions/announcements'
import { Button, Checkbox, Drawer, Field, Input, Select, Tabs, Textarea, cx } from '@/components/ui'
import { AnnouncementPreview } from './AnnouncementPreview'
import { AUDIENCES, PRIORITIES, toLocalInput, type Announcement, type AnnouncementAudience, type AnnouncementPriority } from './types'

type Timing = 'now' | 'schedule'

export function AnnouncementForm({
  isOpen,
  item,
  counts,
  authorName,
  authorRole,
  onClose,
  onSaved,
}: {
  isOpen: boolean
  /** null = new announcement. */
  item: Announcement | null
  counts: Record<AnnouncementAudience, number>
  authorName: string
  authorRole: string
  onClose: () => void
  onSaved: (message: string, title: string, status: string) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [audience, setAudience] = useState<AnnouncementAudience>('all')
  const [priority, setPriority] = useState<AnnouncementPriority>('normal')
  const [timing, setTiming] = useState<Timing>('now')
  const [when, setWhen] = useState('')
  const [push, setPush] = useState(true)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle(item?.title ?? '')
    setContent(item?.content ?? '')
    setAudience(item?.audience ?? 'all')
    setPriority(item?.priority ?? 'normal')
    setTiming(item?.status === 'scheduled' ? 'schedule' : 'now')
    setWhen(toLocalInput(item?.scheduled_for))
    setPush(item?.send_push ?? true)
    setView('write')
    setError(null)
  }, [isOpen, item])

  if (!isOpen) return null

  async function save(asDraft: boolean) {
    if (!title.trim() || !content.trim()) return setError('Write a headline and a message.')
    if (!asDraft && timing === 'schedule' && !when) return setError('Pick the date and time.')
    const status = asDraft ? 'draft' : timing === 'schedule' ? 'scheduled' : 'published'
    setSaving(asDraft ? 'draft' : 'publish')
    setError(null)
    const res = await saveAnnouncement({
      id: item?.id ?? null,
      title,
      content,
      priority,
      status,
      audience,
      scheduled_for: status === 'scheduled' ? new Date(when).toISOString() : null,
      send_push: push,
    })
    setSaving(null)
    if (!res.success) return setError(res.error || "Couldn't save the announcement.")
    const message = asDraft ? 'Draft saved' : status === 'scheduled' ? 'Announcement scheduled' : item?.status === 'published' ? 'Announcement updated' : 'Announcement published'
    onSaved(message, title.trim(), status)
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      width="lg"
      title={item ? 'Edit announcement' : 'New announcement'}
      subtitle={`Posting as ${authorName}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => save(true)} loading={saving === 'draft'} disabled={saving !== null}>Save as draft</Button>
          <Button variant="primary" onClick={() => save(false)} loading={saving === 'publish'} disabled={saving !== null}>
            {timing === 'schedule' ? 'Schedule' : item?.status === 'published' ? 'Save changes' : 'Publish now'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <Tabs label="Form view" value={view} onChange={setView} items={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]} />
        {view === 'preview' ? (
          <AnnouncementPreview title={title} content={content} priority={priority} audience={audience} authorName={authorName} authorRole={authorRole} />
        ) : (
          <>
            <Field label="Headline" htmlFor="ann-title" required>
              <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="No work on 30 Nov (Bonifacio Day)" />
            </Field>
            <Field label="Message" htmlFor="ann-content" required error={error}>
              <Textarea id="ann-content" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Say what is happening, when, and what staff should do." />
            </Field>
            <div className="grid grid-cols-1 gap-stack sm:grid-cols-2">
              <Field label="Who it's for" htmlFor="ann-audience" hint={`${counts[audience]} active ${counts[audience] === 1 ? 'person' : 'people'}`}>
                <Select id="ann-audience" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)} options={AUDIENCES} />
              </Field>
              <Field label="Priority" htmlFor="ann-priority" hint="Shown as a label on the announcement">
                <Select id="ann-priority" value={priority} onChange={(e) => setPriority(e.target.value as AnnouncementPriority)} options={PRIORITIES} />
              </Field>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-caption font-medium text-ink-2">When</legend>
              <div className="grid grid-cols-2 gap-2">
                {(['now', 'schedule'] as const).map((t) => (
                  <label key={t} className={cx('cursor-pointer rounded-control border p-3 text-small', timing === t ? 'border-ink bg-surface-soft' : 'border-line hover:border-line-strong')}>
                    <input type="radio" name="timing" className="sr-only" checked={timing === t} onChange={() => setTiming(t)} />
                    <span className="font-medium text-ink">{t === 'now' ? 'Publish now' : 'Schedule'}</span>
                  </label>
                ))}
              </div>
              {timing === 'schedule' && (
                <Field label="Date and time" htmlFor="ann-when" hint="It won't go out by itself yet: open it on the day and publish it.">
                  <Input id="ann-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                </Field>
              )}
            </fieldset>
            <Checkbox checked={push} onChange={(e) => setPush(e.target.checked)} label="Send a phone notification" hint="Goes out once, when it's published." />
          </>
        )}
      </div>
    </Drawer>
  )
}
