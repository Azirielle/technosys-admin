import { Sidebar, NavItem } from '@/components/dashboard/Sidebar'

const navItems: NavItem[] = [
  { title: 'Audit Logs', href: '/accountant', iconName: 'FileSpreadsheet' },
  { title: 'Broadcaster', href: '/accountant/announcements', iconName: 'MessageSquare' },
]

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar navItems={navItems} title="Accountant" role="accountant" />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
