// AnnouncementDetailModal: one announcement in full, with Edit and Remove (Remove asks first).
'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Pencil, Trash2 } from 'lucide-react'
import { deleteAnnouncement } from '@/app/actions/announcements'
import { formatDay, formatTime } from '@/lib/format'
import { Badge, Button, Modal } from '@/components/ui'
import { STATUS, audienceLabel, priorityOf, roleLabel, type Announcement } from './types'

function when(iso: string) {
  return `${formatDay(iso)}, ${formatTime(iso)}`
}

export function AnnouncementDetailModal({
  item,
  onClose,
  onEdit,
  onRemoved,
}: {
  item: Announcement | null
  onClose: () => void
  onEdit: (a: Announcement) => void
  onRemoved: (a: Announcement) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setConfirming(false)
    setError(null)
  }, [item?.id])

  if (!item) return null
  const status = STATUS[item.status] ?? STATUS.draft
  const priority = priorityOf(item.priority)

  async function remove() {
    if (!item) return
    setRemoving(true)
    const res = await deleteAnnouncement(item.id)
    setRemoving(false)
    if (res.success) onRemoved(item)
    else setError(res.error || "Couldn't remove it.")
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={confirming ? Trash2 : Megaphone}
      iconTone={confirming ? 'danger' : undefined}
      title={confirming ? 'Remove this announcement?' : item.title}
      subtitle={confirming ? 'Staff stop seeing it in the app. This cannot be undone.' : `By ${item.author?.full_name || 'Office'} (${roleLabel(item.author?.role)}) · ${when(item.created_at)}`}
      headerExtra={confirming ? undefined : <Badge tone={status.tone} dot>{status.label}</Badge>}
      maxWidth="lg"
      footer={
        confirming ? (
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
            <Button variant="danger" loading={removing} onClick={remove}>Remove</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" icon={Trash2} onClick={() => setConfirming(true)}>Remove</Button>
            <Button variant="primary" icon={Pencil} onClick={() => onEdit(item)}>Edit</Button>
          </>
        )
      }
    >
      {confirming ? (
        <p className="text-small text-ink-2">“{item.title}”</p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="whitespace-pre-wrap text-body text-ink">{item.content}</p>
          <dl className="grid grid-cols-2 gap-3 rounded-control bg-surface-soft p-3 text-small sm:grid-cols-4">
            <div><dt className="text-caption text-ink-3">For</dt><dd className="text-ink">{audienceLabel(item.audience)}</dd></div>
            <div><dt className="text-caption text-ink-3">Priority</dt><dd className="text-ink">{priority.label}</dd></div>
            <div><dt className="text-caption text-ink-3">Phone alert</dt><dd className="text-ink">{item.send_push ? 'Yes' : 'No'}</dd></div>
            <div>
              <dt className="text-caption text-ink-3">{item.status === 'scheduled' ? 'Scheduled for' : 'Posted'}</dt>
              <dd className="text-ink">{formatDay(item.status === 'scheduled' && item.scheduled_for ? item.scheduled_for : item.created_at)}</dd>
            </div>
          </dl>
          {item.is_edited && item.updated_at && (
            <p className="text-caption text-ink-3">Edited by {item.editor?.full_name || 'office staff'} on {when(item.updated_at)}</p>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-small text-danger">{error}</p>}
    </Modal>
  )
}
