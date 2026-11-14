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
      badgeVariant: 'bg-info-soft text-ink   border-transparent',
      icon: Wrench,
      iconBg: 'bg-info-soft text-ink  border-transparent',
      description: 'Standard customer service job (aircon cleaning, diagnostics, repair, installation) with specific appointment time and customer location.',
      reportingNote: 'Includes reporting travel option (direct to site vs report to HQ first).'
    },
    {
      type: 'deployment' as AssignmentType,
      title: 'Out-of-Town Project',
      badge: 'Long-Term Facility Work',
      badgeVariant: 'bg-info-soft text-info   border-transparent ',
      icon: PlaneTakeoff,
      iconBg: 'bg-info-soft  text-info  border-transparent ',
      description: 'A multi-day project at a remote client or commercial site where the crew stays for days or weeks, without requiring a fixed daily finishing time.',
      reportingNote: 'Includes flexible target review date; technicians can join or leave the crew at any time.'
    },
    {
      type: 'office_duty' as AssignmentType,
      title: 'Main Office Duty',
      badge: 'Internal Attendance',
      badgeVariant: 'bg-success-soft text-success   border-transparent',
      icon: Building2,
      iconBg: 'bg-success-soft text-success border-transparent',
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
              className="flex items-start gap-4 p-4 rounded-xl border border-line hover:border-line-strong bg-surface hover:bg-info-soft/30 transition-all cursor-pointer group shadow-2xs"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg}`}>
                <Icon className="w-5 h-5 stroke-[1.8]" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-ink group-hover:text-ink transition-colors">
                    {item.title}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-micro font-semibold border ${item.badgeVariant}`}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {item.description}
                </p>
                <p className="text-micro text-ink-3 font-medium">
                  {item.reportingNote}
                </p>
              </div>

              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-3 group-hover:text-ink group-hover:translate-x-0.5 transition-all self-center shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )
        })}
      </div>
    </ModalDialog>
  )
}
