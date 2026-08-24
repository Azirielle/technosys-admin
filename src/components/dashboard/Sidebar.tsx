import Link from 'next/link'
import { LucideIcon, UserCircle, LogOut } from 'lucide-react'
import { logout } from '@/app/actions'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

interface SidebarProps {
  navItems: NavItem[]
  title: string
}

export function Sidebar({ navItems, title }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">TechnoSys Admin</p>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-800 transition-colors relative"
            >
              <Icon className="w-5 h-5 text-gray-400" />
              {item.title}
              {/* Notification Badges will be injected here in the future if needed */}
            </Link>
          )
        })}
      </nav>
      
      {/* Profile & Logout Section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2 mb-4">
          <UserCircle className="w-8 h-8 text-gray-400" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Admin User</span>
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </div>
        <form action={logout} className="w-full">
          <button type="submit" className="flex items-center w-full gap-3 px-2 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-md transition-colors">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  )
}
