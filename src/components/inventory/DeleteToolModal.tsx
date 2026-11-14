// DeleteToolModal: confirms removing a tool from the inventory for good.
'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteInventoryItem } from '@/app/actions/inventory'
import { Button, Modal } from '@/components/ui'
import type { Tool } from './types'

export function DeleteToolModal({ tool, onClose, onDone }: { tool: Tool | null; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  if (!tool) return null

  function remove() {
    if (!tool) return
    startSaving(async () => {
      const res = await deleteInventoryItem(tool.id)
      if (res?.error) setError(res.error)
      else onDone()
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={Trash2}
      iconTone="danger"
      title={`Delete ${tool.name}?`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Keep tool</Button>
          <Button variant="danger" loading={saving} onClick={remove}>Delete tool</Button>
        </>
      }
    >
      <p className="text-small text-ink-2">
        This removes it from the list for good. If it's only broken or old, edit it and set the status to Being repaired or Retired instead.
      </p>
      {error && <p role="alert" className="mt-3 text-small text-danger">{error}</p>}
    </Modal>
  )
}
