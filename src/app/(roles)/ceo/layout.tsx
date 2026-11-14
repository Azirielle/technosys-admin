'use client'

import React from 'react'
import AdminRoleLayout from '@/components/dashboard/AdminRoleLayout'
import { NavItem } from '@/components/dashboard/AdminDock'

const navItems: NavItem[] = [
  { title: 'Overview', href: '/ceo', iconName: 'Home' },
  { title: 'Temporary Access', href: '/ceo/access', iconName: 'ShieldCheck' },
  { title: 'Activity History', href: '/ceo/activities', iconName: 'FileSpreadsheet' },
  { title: 'Announcements', href: '/ceo/announcements', iconName: 'Megaphone' },
]

export default function CEOLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoleLayout
      role="ceo"
      portalTitle="TechnoCycle"
      portalSubtitle="Executive Portal"
      navItems={navItems}
    >
      {children}
    </AdminRoleLayout>
  )
}
