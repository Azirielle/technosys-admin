import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'
import { Home, Calendar, MapPin, Box } from 'lucide-react'

const navItems: NavItem[] = [
  { title: 'Scheduling', href: '/coordinator', icon: Calendar },
  { title: 'Live Tracking', href: '/coordinator/tracking', icon: MapPin },
  { title: 'Inventory', href: '/coordinator/inventory', icon: Box },
]

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} title="Field Operations" />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
