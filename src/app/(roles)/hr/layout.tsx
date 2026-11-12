'use client'

import React from 'react'
import AdminRoleLayout from '@/components/dashboard/AdminRoleLayout'
import { NavItem } from '@/components/dashboard/AdminDock'

const navItems: NavItem[] = [
  { title: 'Leave Management', href: '/hr/leaves', iconName: 'Calendar' },
  { title: 'Tickets', href: '/hr/tickets', iconName: 'MessageSquare' },
  { title: '201 Files', href: '/hr/files', iconName: 'FolderOpen' },
  { title: 'Policies & Handbooks', href: '/hr/policies', iconName: 'ScrollText' },
  { title: 'Broadcaster', href: '/hr/announcements', iconName: 'Megaphone' },
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
