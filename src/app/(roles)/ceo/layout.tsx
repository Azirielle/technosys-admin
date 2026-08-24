import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'
import { Home, Settings } from 'lucide-react'

const navItems: NavItem[] = [
  { title: 'System Overrides', href: '/ceo', icon: Settings },
]

export default function CEOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} title="Executive View" />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
