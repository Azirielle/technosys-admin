import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'
import { Home, Calendar, MapPin, Box } from 'lucide-react'

const navItems: NavItem[] = [
  { title: 'Scheduling', href: '/coordinator', iconName: 'Calendar' },
  { title: 'Live Tracking', href: '/coordinator/tracking', iconName: 'MapPin' },
  { title: 'Inventory', href: '/coordinator/inventory', iconName: 'Box' },
]

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar navItems={navItems} title="Field Operations" role="coordinator" />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
