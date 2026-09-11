'use client'

import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'

const navItems: NavItem[] = [
  { title: 'Tickets & Leaves', href: '/hr', iconName: 'Ticket' },
  { title: '201 Files', href: '/hr/files', iconName: 'FolderOpen' },
  { title: 'Broadcaster', href: '/hr/announcements', iconName: 'MessageSquare' },
]

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden transition-colors duration-200">
      <Sidebar navItems={navItems} title="HR Department" role="hr" />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
