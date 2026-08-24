import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'
import { Home, FileSpreadsheet } from 'lucide-react'

const navItems: NavItem[] = [
  { title: 'Audit Logs', href: '/accountant', icon: FileSpreadsheet },
]

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} title="Accountant View" />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
