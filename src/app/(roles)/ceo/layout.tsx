import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'
import { Home, Settings } from 'lucide-react'

const navItems: NavItem[] = [
  { title: 'System Overrides', href: '/ceo', iconName: 'Settings' },
]

export default function CEOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar navItems={navItems} title="Chief Executive Officer" />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
