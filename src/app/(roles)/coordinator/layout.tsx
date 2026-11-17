'use client'

import React from 'react'
import AdminRoleLayout from '@/components/dashboard/AdminRoleLayout'
import { NavItem } from '@/components/dashboard/AdminDock'

const navItems: NavItem[] = [
  { title: 'Overview', href: '/coordinator', iconName: 'Home' },
  { title: 'Today', href: '/coordinator/today', iconName: 'ClipboardCheck' },
  { title: 'Scheduling', href: '/coordinator/jobs', iconName: 'Calendar' },
  { title: 'Live Map', href: '/coordinator/tracking', iconName: 'MapPin' },
  { title: 'Inventory', href: '/coordinator/inventory', iconName: 'Box' },
  { title: 'Announcements', href: '/coordinator/announcements', iconName: 'Megaphone' },
]

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoleLayout
      role="coordinator"
      portalTitle="TechnoCycle"
      portalSubtitle="Service Dept"
      navItems={navItems}
    >
      {children}
    </AdminRoleLayout>
  )
}
