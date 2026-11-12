'use client'

import React from 'react'
import AdminRoleLayout from '@/components/dashboard/AdminRoleLayout'
import { NavItem } from '@/components/dashboard/AdminDock'

const navItems: NavItem[] = [
  { title: 'Audit Logs', href: '/accountant', iconName: 'FileSpreadsheet' },
  { title: 'Broadcaster', href: '/accountant/announcements', iconName: 'Megaphone' },
]

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoleLayout
      role="accountant"
      portalTitle="TechnoCycle"
      portalSubtitle="Finance & Audit"
      navItems={navItems}
    >
      {children}
    </AdminRoleLayout>
  )
}
