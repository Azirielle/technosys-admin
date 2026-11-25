// ArchiveAccountModal: HR confirms archiving someone (they can't sign in any more) or restoring an archived account.
'use client'

import { Archive, ArchiveRestore } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import type { EmployeeFile } from './requirements'

export function ArchiveAccountModal({
  employee,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  employee: EmployeeFile | null
  saving: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!employee) return null
  const restoring = employee.lifecycle_status === 'archived'
  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={restoring ? ArchiveRestore : Archive}
      title={restoring ? `Restore ${employee.full_name}?` : `Archive ${employee.full_name}?`}
      maxWidth="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={restoring ? 'primary' : 'danger'} loading={saving} onClick={onConfirm}>
            {restoring ? 'Restore account' : 'Archive account'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack text-sm text-ink-2">
        <p>
          {restoring
            ? 'They can sign in again with their mobile number and PIN, and can be put on jobs.'
            : "They can't sign in any more, even on a phone that's already signed in, and can't be put on jobs. Their DTR, jobs and records stay. You can restore them later."}
        </p>
        {error && <p role="alert" className="text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
