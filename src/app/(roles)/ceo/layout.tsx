'use client'

import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'

const navItems: NavItem[] = [
  { title: 'System Overrides', href: '/ceo', iconName: 'Settings' },
  { title: 'Admin Activities', href: '/ceo/activities', iconName: 'FileSpreadsheet' },
  { title: 'Broadcaster', href: '/ceo/announcements', iconName: 'MessageSquare' },
]

export default function CEOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden transition-colors duration-200">
      <Sidebar navItems={navItems} title="Chief Executive Officer" role="ceo" />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
