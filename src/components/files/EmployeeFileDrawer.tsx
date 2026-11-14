// EmployeeFileDrawer: one person's 201 file in a side panel — documents and warnings, with edit and reminder actions.
'use client'

import { useEffect, useState } from 'react'
import { Pencil, Send } from 'lucide-react'
import { formatDay } from '@/lib/format'
import { Button, Drawer, Tabs } from '@/components/ui'
import { DocumentChecklist } from './DocumentChecklist'
import { WarningList } from './WarningList'
import { EMPLOYMENT_STATUS, LEVELS, fileStatus, labelOf, type DocKey, type EmployeeFile } from './requirements'

type View = 'documents' | 'warnings'

export function EmployeeFileDrawer({
  employee,
  savingKey,
  reminding,
  onClose,
  onToggleDocument,
  onRemind,
  onEditDetails,
  onAddWarning,
}: {
  employee: EmployeeFile | null
  savingKey: DocKey | null
  reminding: boolean
  onClose: () => void
  onToggleDocument: (key: DocKey, received: boolean) => void
  onRemind: () => void
  onEditDetails: () => void
  onAddWarning: () => void
}) {
  const [view, setView] = useState<View>('documents')
  useEffect(() => setView('documents'), [employee?.id])
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
      headerExtra={<Button size="sm" variant="ghost" icon={Pencil} onClick={onEditDetails}>Edit details</Button>}
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
          ]}
        />
        {view === 'documents' ? (
          <DocumentChecklist employee={employee} savingKey={savingKey} onToggle={onToggleDocument} />
        ) : (
          <WarningList warnings={employee.warnings} onAdd={onAddWarning} />
        )}
      </div>
    </Drawer>
  )
}
