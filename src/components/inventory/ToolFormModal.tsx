// ToolFormModal: add a new tool or edit one (name, category, asset tag, stock, cost, photo).
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Package, RefreshCw } from 'lucide-react'
import { createOrUpdateInventoryItem } from '@/app/actions/inventory'
import { Button, Field, IconButton, Input, Modal, Select, Textarea } from '@/components/ui'
import { CATEGORIES, TOOL_STATUS, newAssetTag, type Tool } from './types'

export function ToolFormModal({
  isOpen,
  tool,
  onClose,
  onSaved,
}: {
  isOpen: boolean
  /** null = add a new tool. */
  tool: Tool | null
  onClose: () => void
  onSaved: () => void
}) {
  const [tag, setTag] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    if (!isOpen) return
    setTag(tool ? tool.serial_number || '' : newAssetTag())
    setError(null)
  }, [isOpen, tool])

  if (!isOpen) return null

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setError(null)
    startSaving(async () => {
      const res = await createOrUpdateInventoryItem(data)
      if (res?.error) setError(res.error)
      else onSaved()
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={Package}
      title={tool ? 'Edit tool' : 'Add a tool'}
      subtitle={tool?.name}
      maxWidth="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="tool-form" variant="primary" loading={saving}>{tool ? 'Save changes' : 'Add tool'}</Button>
        </>
      }
    >
      <form id="tool-form" onSubmit={submit} className="flex flex-col gap-stack">
        {tool && <input type="hidden" name="id" value={tool.id} />}
        {/* Keep the serialized flag; without this every edit reset it to false. */}
        <input type="hidden" name="is_serialized" value={tool?.is_serialized ? 'true' : 'false'} />
        {tool?.image_url && <input type="hidden" name="image_url" value={tool.image_url} />}
        <div className="grid grid-cols-1 gap-stack sm:grid-cols-2">
          <Field label="Name" htmlFor="tool-name" required>
            <Input id="tool-name" name="name" required defaultValue={tool?.name ?? ''} placeholder="Vacuum pump, 4 CFM" />
          </Field>
          <Field label="Category" htmlFor="tool-category">
            <Select id="tool-category" name="category" defaultValue={tool?.category ?? 'General Tools'} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Asset tag or serial number" htmlFor="tool-tag" hint="Leave the generated tag, or type the maker's serial.">
            <div className="flex gap-inline">
              <Input id="tool-tag" name="serial_number" className="flex-1 font-mono" value={tag} onChange={(e) => setTag(e.target.value)} />
              <IconButton icon={RefreshCw} label="Make a new tag" variant="secondary" onClick={() => setTag(newAssetTag())} />
            </div>
          </Field>
          <Field label="Status" htmlFor="tool-status">
            <Select
              id="tool-status"
              name="status"
              defaultValue={tool?.status ?? 'active'}
              options={Object.entries(TOOL_STATUS).map(([value, s]) => ({ value, label: s.label }))}
            />
          </Field>
          <Field label="Total owned" htmlFor="tool-total" required hint="In the warehouse is worked out: total minus what's lent out.">
            <Input id="tool-total" name="total_stock" type="number" min={0} required defaultValue={tool?.total_stock ?? 1} />
          </Field>
          <Field label="Photo" htmlFor="tool-photo" hint={tool?.image_url ? 'Choose a file to replace the current photo.' : 'Optional'}>
            <Input id="tool-photo" name="image" type="file" accept="image/*" className="file:mr-3 file:rounded-pill file:border-0 file:bg-surface file:px-3 file:py-1 file:text-caption file:text-ink" />
          </Field>
        </div>
        <Field label="Notes" htmlFor="tool-notes" error={error}>
          <Textarea id="tool-notes" name="description" rows={2} defaultValue={tool?.description ?? ''} placeholder="Comes with a hard case and two hoses." />
        </Field>
      </form>
    </Modal>
  )
}
