'use client'

import React from 'react'
import ModalDialog from '@/components/ui/ModalDialog'
import { Wrench, PlaneTakeoff, Building2, ChevronRight, X } from 'lucide-react'
import { AssignmentType } from './types'

interface NewAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectType: (type: AssignmentType) => void
}

export default function NewAssignmentModal({
  isOpen,
  onClose,
  onSelectType
}: NewAssignmentModalProps) {
  if (!isOpen) return null

  const assignmentTypes = [
    {
      type: 'on_site' as AssignmentType,
      title: 'On-site Service',
      badge: 'Specific Appointment',
      badgeVariant: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      icon: Wrench,
      iconBg: 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      description: 'Standard customer service job (aircon cleaning, diagnostics, repair, installation) with specific appointment time and customer location.',
      reportingNote: 'Includes reporting travel option (direct to site vs report to HQ first).'
    },
    {
      type: 'deployment' as AssignmentType,
      title: 'Out-of-Town Project',
      badge: 'Long-Term Facility Work',
      badgeVariant: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      icon: PlaneTakeoff,
      iconBg: 'bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      description: 'A multi-day project at a remote client or commercial site where the crew stays for days or weeks, without requiring a fixed daily finishing time.',
      reportingNote: 'Includes flexible target review date; technicians can join or leave the crew at any time.'
    },
    {
      type: 'office_duty' as AssignmentType,
      title: 'Main Office Duty',
      badge: 'Internal Attendance',
      badgeVariant: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: Building2,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      description: 'Expected attendance shift at Pacita HQ for inventory maintenance, workshop overhaul, or standby duty without a customer dispatch.',
      reportingNote: 'Automatically locks Pacita HQ coordinates for mobile clock-in geofence validation.'
    }
  ]

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="What do you need to schedule?"
      subtitle="Select the assignment type to open the dedicated form with only the details relevant to that situation."
      maxWidth="xl"
    >
      <div className="space-y-3 py-1">
        {assignmentTypes.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.type}
              onClick={() => {
                onSelectType(item.type)
                onClose()
              }}
              className="flex items-start gap-4 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-zinc-900/60 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer group shadow-2xs"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg}`}>
                <Icon className="w-5 h-5 stroke-[1.8]" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.badgeVariant}`}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                  {item.reportingNote}
                </p>
              </div>

              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all self-center shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )
        })}
      </div>
    </ModalDialog>
  )
}
