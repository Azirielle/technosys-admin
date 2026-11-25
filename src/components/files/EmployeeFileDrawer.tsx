// EmployeeFileDrawer: one person's 201 file in a side panel — documents, warnings and mobile sign-in (PIN, phone).
'use client'

import { useEffect, useState } from 'react'
import { Archive, ArchiveRestore, Pencil, Send } from 'lucide-react'
import { formatDay } from '@/lib/format'
import { Button, Drawer, Tabs } from '@/components/ui'
import { DocumentChecklist } from './DocumentChecklist'
import { WarningList } from './WarningList'
import { SignInPanel } from './SignInPanel'
import { EMPLOYMENT_STATUS, LEVELS, fileStatus, labelOf, type DocKey, type EmployeeFile } from './requirements'

type View = 'documents' | 'warnings' | 'signin'

export function EmployeeFileDrawer({
  employee,
  savingKey,
  reminding,
  onClose,
  onToggleDocument,
  onRemind,
  onEditDetails,
  onArchive,
  onAddWarning,
  hasPhoneRequest,
  onSignInChanged,
}: {
  employee: EmployeeFile | null
  savingKey: DocKey | null
  reminding: boolean
  onClose: () => void
  onToggleDocument: (key: DocKey, received: boolean) => void
  onRemind: () => void
  onEditDetails: () => void
  onArchive: () => void
  onAddWarning: () => void
  /** Waiting for HR to approve a new phone: open on the Sign-in tab */
  hasPhoneRequest: boolean
  onSignInChanged: () => void
}) {
  const [view, setView] = useState<View>('documents')
  useEffect(() => setView(hasPhoneRequest ? 'signin' : 'documents'), [employee?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!employee) return null

  const s = fileStatus(employee)
  const facts = [
    labelOf(LEVELS, employee.technician_level),
    labelOf(EMPLOYMENT_STATUS, employee.employment_status),
    employee.hire_date ? `Hired ${formatDay(employee.hire_date)}` : null,
    employee.contact_number,
  ].filter(Boolean)

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={employee.full_name}
      subtitle={facts.join(' · ')}
      headerExtra={
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon={Pencil} onClick={onEditDetails}>Edit details</Button>
          {employee.lifecycle_status === 'archived'
            ? <Button size="sm" variant="ghost" icon={ArchiveRestore} onClick={onArchive}>Restore</Button>
            : <Button size="sm" variant="ghost" icon={Archive} onClick={onArchive}>Archive</Button>}
        </div>
      }
      footer={
        view === 'documents' && !s.complete ? (
          <Button variant="primary" icon={Send} loading={reminding} onClick={onRemind}>
            Ask for {s.missing.length} missing {s.missing.length === 1 ? 'document' : 'documents'}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <Tabs
          label="201 file section"
          value={view}
          onChange={setView}
          items={[
            { value: 'documents', label: 'Documents', count: s.done },
            { value: 'warnings', label: 'Warnings', count: employee.warnings.length },
            { value: 'signin', label: hasPhoneRequest ? 'Sign-in (new phone)' : 'Sign-in' },
          ]}
        />
        {view === 'documents' ? (
          <DocumentChecklist employee={employee} savingKey={savingKey} onToggle={onToggleDocument} />
        ) : view === 'warnings' ? (
          <WarningList warnings={employee.warnings} onAdd={onAddWarning} />
        ) : (
          <SignInPanel key={employee.id} employee={employee} onChanged={onSignInChanged} />
        )}
      </div>
    </Drawer>
  )
}
