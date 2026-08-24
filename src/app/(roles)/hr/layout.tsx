import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'
import { Home, Users, MessageSquare, AlertTriangle } from 'lucide-react'

const navItems: NavItem[] = [
  { title: 'Tickets & Leaves', href: '/hr', icon: MessageSquare },
  { title: '201 Files', href: '/hr/files', icon: Users },
]

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} title="HR Department" />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
