'use client'

import React from 'react'
import AdminRoleLayout from '@/components/dashboard/AdminRoleLayout'
import { NavItem } from '@/components/dashboard/AdminDock'

const navItems: NavItem[] = [
  { title: 'Overview', href: '/hr', iconName: 'Home' },
  { title: 'Leave Requests', href: '/hr/leaves', iconName: 'Calendar' },
  { title: 'Tickets', href: '/hr/tickets', iconName: 'MessageSquare' },
  { title: 'DTR & Attendance', href: '/hr/audit', iconName: 'FileSpreadsheet' },
  { title: '201 Files', href: '/hr/files', iconName: 'FolderOpen' },
  { title: 'Work Phones', href: '/hr/phones', iconName: 'Smartphone' },
  { title: 'Policies & Handbooks', href: '/hr/policies', iconName: 'ScrollText' },
  { title: 'Announcements', href: '/hr/announcements', iconName: 'Megaphone' },
]

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoleLayout
      role="hr"
      portalTitle="TechnoCycle"
      portalSubtitle="HR Department"
      navItems={navItems}
    >
      {children}
    </AdminRoleLayout>
  )
}
