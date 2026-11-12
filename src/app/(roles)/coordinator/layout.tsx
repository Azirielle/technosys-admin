'use client'

import React from 'react'
import AdminRoleLayout from '@/components/dashboard/AdminRoleLayout'
import { NavItem } from '@/components/dashboard/AdminDock'

const navItems: NavItem[] = [
  { title: 'Scheduling', href: '/coordinator', iconName: 'Calendar' },
  { title: 'Fleet Tracking', href: '/coordinator/tracking', iconName: 'MapPin' },
  { title: 'Inventory', href: '/coordinator/inventory', iconName: 'Box' },
  { title: 'Broadcaster', href: '/coordinator/announcements', iconName: 'Megaphone' },
]

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoleLayout
      role="coordinator"
      portalTitle="TechnoCycle"
      portalSubtitle="Field Operations"
      navItems={navItems}
    >
      {children}
    </AdminRoleLayout>
  )
}
